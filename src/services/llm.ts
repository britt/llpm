import { generateText, streamText, stepCountIs, type ModelMessage } from 'ai';
import type { Message } from '../types';
import { debug, getVerbose } from '../utils/logger';
import { getToolRegistry } from '../tools/registry';
import { getSystemPrompt } from '../utils/systemPrompt';
import { modelRegistry } from './modelRegistry';
import { RequestContext } from '../utils/requestContext';
import { traced, getTracer } from '../utils/tracing';
import { getSkillRegistry } from './SkillRegistry';

const MAX_STEPS = 35;

export async function generateResponse(messages: Message[]): Promise<{ response: string; selectedSkills: string[] }> {
  debug('generateResponse called with', messages.length, 'messages');
  debug('Last message:', messages[messages.length - 1]);

  return traced('llm.generateResponse', {
    attributes: {
      'message.count': messages.length,
      'message.last_role': messages[messages.length - 1]?.role || 'unknown',
    },
    openInferenceKind: 'LLM',  // Phoenix UI span kind
  }, async (span) => {
    try {
      const model = await modelRegistry.createLanguageModel();
      const currentModel = modelRegistry.getCurrentModel();

      span.setAttribute('llm.provider', currentModel.provider);
      span.setAttribute('llm.model', currentModel.modelId);
      span.setAttribute('llm.model_display', currentModel.displayName);

      // Get system prompt (without skills)
      const systemPromptContent = await getSystemPrompt();
      const systemMessage = {
        role: 'system' as const,
        content: systemPromptContent
      };

      // Extract last user message for skill selection
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop()?.content;

      // Find relevant skills based on user message
      let skillsMessage: ModelMessage | null = null;
      const selectedSkillNames: string[] = [];
      if (lastUserMessage) {
        try {
          const skillRegistry = getSkillRegistry();
          const matchedSkills = skillRegistry.findRelevant({ userMessage: lastUserMessage });

          if (matchedSkills.length > 0) {
            debug(`Injecting ${matchedSkills.length} skill(s) as assistant message`);
            const skills = matchedSkills.map(r => r.skill);
            const skillsContent = await skillRegistry.generatePromptAugmentation(skills);

            if (skillsContent) {
              skillsMessage = {
                role: 'assistant' as const,
                content: `I'll use the following skills as helpful instructions for answering your next question:\n\n${skillsContent}`
              };

              // Collect selected skill names for UI display
              selectedSkillNames.push(...matchedSkills.map(r => r.skill.name));

              // Emit selection events
              for (const result of matchedSkills) {
                skillRegistry.emit('skill.selected', {
                  type: 'skill.selected',
                  skillName: result.skill.name,
                  rationale: result.rationale
                });
              }

              span.setAttribute('skills.selected_count', matchedSkills.length);
              span.setAttribute('skills.names', matchedSkills.map(r => r.skill.name).join(', '));
            }
          }
        } catch (error) {
          debug('Error selecting skills:', error);
        }
      }

      // Build messages array with skill injection before last user message
      const conversationMessages = messages
        .filter(msg => msg.role !== 'ui-notification')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        } as ModelMessage));

      const allMessages: ModelMessage[] = [systemMessage];

      if (skillsMessage && conversationMessages.length > 0) {
        // Insert skill message before the last user message
        allMessages.push(...conversationMessages.slice(0, -1));
        allMessages.push(skillsMessage);
        allMessages.push(conversationMessages[conversationMessages.length - 1]);
      } else {
        allMessages.push(...conversationMessages);
      }

      const tools = await getToolRegistry();
      const toolCount = Object.keys(tools).length;
      span.setAttribute('llm.tools.count', toolCount);

      debug(
        'Calling AI API with model:',
        currentModel.displayName,
        '(' + currentModel.provider + '/' + currentModel.modelId + ')',
        'and',
        toolCount,
        'tools'
      );

      // Log LLM call start
      RequestContext.logLLMCall('start', `${currentModel.provider}/${currentModel.modelId}`);

      const result = await generateText({
        model,
        messages: allMessages,
        tools,
        toolChoice: 'auto',
        stopWhen: [stepCountIs(MAX_STEPS)],
        experimental_telemetry: {
          isEnabled: true,
          tracer: getTracer(),
          functionId: 'llpm.generateResponse',
          metadata: {
            provider: currentModel.provider,
            model: currentModel.modelId,
            toolCount: toolCount
          }
        }
      });

      // Log LLM call end with token counts if available
      const metadata: any = { status: 200 };
      if (result.usage) {
        metadata.tokensIn = (result.usage as any).promptTokens || (result.usage as any).totalTokens;
        metadata.tokensOut = (result.usage as any).completionTokens;

        // Add token counts to span
        span.setAttribute('llm.usage.prompt_tokens', metadata.tokensIn || 0);
        span.setAttribute('llm.usage.completion_tokens', metadata.tokensOut || 0);
        span.setAttribute('llm.usage.total_tokens', (metadata.tokensIn || 0) + (metadata.tokensOut || 0));
      }
      RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, metadata);

      debug('AI SDK result text:', JSON.stringify(result.text));
      debug('Steps count:', result.steps?.length || 0);

      // Collect all tool calls and results from all steps
      const allToolCalls: any[] = [];
      const allToolResults: any[] = [];
      const toolNames = new Set<string>();

      if (result.steps) {
        for (const step of result.steps) {
          if (step.toolCalls) {
            allToolCalls.push(...step.toolCalls);
            step.toolCalls.forEach(tc => toolNames.add(tc.toolName));
          }
          if (step.toolResults) {
            allToolResults.push(...step.toolResults);
          }
        }
      }

      debug('Tool calls across all steps:', allToolCalls.length);
      debug('Tool results across all steps:', allToolResults.length);
      debug('Unique tools called:', Array.from(toolNames).join(', '));

      // Record tool call statistics
      span.setAttribute('llm.steps.count', result.steps?.length || 0);
      span.setAttribute('llm.tool_calls.count', allToolCalls.length);
      span.setAttribute('llm.tool_results.count', allToolResults.length);
      if (toolNames.size > 0) {
        span.setAttribute('llm.tool_calls.tools', Array.from(toolNames).join(','));
      }
      span.setAttribute('llm.response.length', result.text?.length || 0);

      // Check for user messages in tool results that should be displayed directly
      const userMessages: string[] = [];
      for (const toolResult of allToolResults) {
        if (toolResult.output && typeof toolResult.output === 'object') {
          const resultObj = toolResult.output as any;
          if (resultObj.userMessage) {
            userMessages.push(resultObj.userMessage);
          }
        }
      }

      // If we have user messages, prepend them to the AI's response
      let responseText = result.text;
      if (userMessages.length > 0) {
        const userMessageSection = userMessages.join('\n\n---\n\n');
        responseText = userMessageSection + '\n\n' + result.text;
      }

      return { response: responseText, selectedSkills: selectedSkillNames };
    } catch (error) {
      // Log LLM error
      const currentModel = modelRegistry.getCurrentModel();
      RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      debug('Error in generateResponse:', error);
      console.error('Error generating response:', error);

      let errorMessage = 'Sorry, I encountered an error while processing your request.';

      if (getVerbose() && error instanceof Error) {
        errorMessage += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
        if (error.stack) {
          errorMessage += `\n\nStack trace:\n${error.stack}`;
        }
      }

      throw error; // Re-throw so traced() can record the error
    }
  });
}

export async function* streamResponse(messages: ModelMessage[]) {
  try {
    const model = await modelRegistry.createLanguageModel();
    const currentModel = modelRegistry.getCurrentModel();

    // Log streaming LLM call start
    RequestContext.logLLMCall('start', `${currentModel.provider}/${currentModel.modelId}`);

    const { textStream } = await streamText({
      model,
      messages,
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
        functionId: 'llpm.streamResponse',
        metadata: {
          provider: currentModel.provider,
          model: currentModel.modelId,
          messageCount: messages.length
        }
      }
    });

    for await (const delta of textStream) {
      yield delta;
    }
    
    // Log streaming LLM call end
    RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, { status: 200 });
  } catch (error) {
    // Log streaming LLM error  
    const errorModel = modelRegistry.getCurrentModel();
    RequestContext.logLLMCall('end', `${errorModel.provider}/${errorModel.modelId}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    console.error('Error streaming response:', error);

    let errorMessage = 'Sorry, I encountered an error while processing your request.';

    if (getVerbose() && error instanceof Error) {
      errorMessage += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
      if (error.stack) {
        errorMessage += `\n\nStack trace:\n${error.stack}`;
      }
    }

    yield errorMessage;
  }
}
