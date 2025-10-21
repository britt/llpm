# Arize Phoenix - Self-Hosted Tracing Backend

Arize Phoenix is a containerized tracing and observability UI designed for LLM and AI workloads. This directory contains Docker configurations to run Phoenix as an alternative to Jaeger for OTEL trace analysis.

## Quick Start (Development/Demo Mode)

Phoenix runs with SQLite by default, making it ideal for local development and demos:

```bash
cd docker/phoenix
docker-compose up -d
```

Access the Phoenix UI at: [http://localhost:6006](http://localhost:6006)

### Verify Installation

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f phoenix

# Health check
curl http://localhost:6006
```

## Features

- **LLM-Specific Tooling**: Built for analyzing LLM traces with rich UI features
- **Flexible Storage**: SQLite for development, PostgreSQL for production
- **OTEL Integration**: Native support for OpenTelemetry traces via gRPC (port 4317)
- **Prometheus Metrics**: Optional metrics export on port 9090
- **Authentication**: OAuth2/OIDC support for production deployments

## Ports

| Port | Purpose |
|------|---------|
| 6006 | Phoenix Web UI |
| 4319 | gRPC endpoint for OTEL traces (mapped from container port 4317) |
| 9090 | Prometheus metrics (optional) |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key variables:

- `PHOENIX_WORKING_DIR`: Directory for SQLite database (default: `/phoenix-data`)
- `PHOENIX_SQL_DATABASE_URL`: PostgreSQL connection string for production
- `PHOENIX_ADMINS`: Admin users (format: `username=email;username2=email2`)
- `PHOENIX_ALLOW_EXTERNAL_RESOURCES`: Enable/disable external resources like Google Fonts

See `.env.example` for full configuration options.

## Production Deployment

For production workloads, use PostgreSQL instead of SQLite for better performance and reliability.

### Option 1: Using docker-compose-postgres.yml

```bash
cd docker/phoenix
docker-compose -f docker-compose-postgres.yml up -d
```

This variant includes:
- Phoenix container
- PostgreSQL database with persistent storage
- Automatic database initialization
- Production-ready resource limits

### Option 2: External PostgreSQL Database

1. Set `PHOENIX_SQL_DATABASE_URL` in your `.env`:
   ```
   PHOENIX_SQL_DATABASE_URL=postgresql://user:password@postgres-host:5432/phoenix
   ```

2. Start Phoenix:
   ```bash
   docker-compose up -d
   ```

## OTEL Collector Integration

To send traces from your OTEL Collector to Phoenix, configure the collector's exporter:

### OTEL Collector Configuration

Add the following to your `otel-collector-config.yaml`:

```yaml
exporters:
  otlp/phoenix:
    endpoint: "http://localhost:4319"  # Use localhost:4319 from host, or phoenix:4317 within Docker network
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/phoenix, jaeger]  # Send to both Phoenix and Jaeger
```

### Docker Compose Integration

If running the OTEL collector in the same Docker Compose stack, add Phoenix to your collector's depends_on:

```yaml
services:
  otel-collector:
    # ... your existing config
    depends_on:
      - phoenix
    environment:
      - PHOENIX_ENDPOINT=http://phoenix:4317  # Use port 4317 within Docker network
```

## Security & Operations

### Authentication

For production deployments, enable authentication:

1. **Local Admin Users**:
   ```bash
   PHOENIX_ADMINS=admin=admin@company.com;user2=user2@company.com
   ```

2. **OAuth2/OIDC**:
   Configure OAuth provider in `.env`:
   ```
   PHOENIX_AUTH_PROVIDER=oidc
   PHOENIX_OIDC_CLIENT_ID=your-client-id
   PHOENIX_OIDC_CLIENT_SECRET=your-client-secret
   PHOENIX_OIDC_ISSUER=https://your-issuer.com
   ```

See [Arize Authentication Docs](https://arize.com/docs/phoenix/self-hosting/features/authentication) for provider-specific configuration.

### TLS Termination

For production, run Phoenix behind a reverse proxy (nginx, Traefik, etc.) with TLS:

```yaml
# Example nginx config
location /phoenix/ {
    proxy_pass http://phoenix:6006/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Set `PHOENIX_HOST_ROOT_PATH=/phoenix` in your environment.

### Data Retention & Backups

#### SQLite Mode
- Data stored in Docker volume `phoenix-data`
- Backup: `docker run --rm -v phoenix-data:/data -v $(pwd):/backup ubuntu tar czf /backup/phoenix-backup.tar.gz /data`

#### PostgreSQL Mode
- Use standard PostgreSQL backup tools (`pg_dump`, `pg_basebackup`)
- Configure retention policies based on your requirements
- Example backup script:
  ```bash
  docker exec postgres pg_dump -U phoenix phoenix > backup-$(date +%Y%m%d).sql
  ```

## Resource Limits

For production deployments, set resource limits in `docker-compose-postgres.yml`:

```yaml
services:
  phoenix:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

Adjust based on your trace volume and workload.

## Kubernetes Deployment

For Kubernetes/Helm deployments, see:
- [Arize Phoenix Kubernetes Documentation](https://arize.com/docs/phoenix/self-hosting/deployment-options/kubernetes-helm)
- Official Helm chart: [phoenix-helm-chart](https://github.com/Arize-ai/phoenix/tree/main/charts)

Example kustomize resources are available in `k8s/` (if applicable).

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs phoenix

# Verify ports aren't in use
lsof -i :6006
lsof -i :4319
```

### UI not accessible
- Verify container is running: `docker-compose ps`
- Check firewall rules
- Verify port mapping in `docker-compose.yml`

### Traces not appearing
- Verify OTEL collector is sending to correct endpoint (localhost:4319 from host, phoenix:4317 within Docker)
- Check Phoenix logs for ingestion errors
- Verify gRPC port 4319 is accessible from host
- Test with: `grpcurl -plaintext localhost:4319 list`

### Data persistence issues
- Check volume mounts: `docker volume inspect phoenix-data`
- Verify `PHOENIX_WORKING_DIR` permissions
- For PostgreSQL: verify database connectivity

## References

- [Arize Phoenix Documentation](https://arize.com/docs/phoenix)
- [Self-Hosting Guide](https://arize.com/docs/phoenix/self-hosting)
- [Docker Deployment](https://arize.com/docs/phoenix/self-hosting/deployment-options/docker)
- [Configuration Reference](https://arize.com/docs/phoenix/self-hosting/configuration)
- [GitHub Repository](https://github.com/Arize-ai/phoenix)

## Migration from Jaeger

If you're migrating from Jaeger:

1. **Dual Export**: Configure OTEL collector to export to both Phoenix and Jaeger during transition
2. **Data Migration**: Phoenix and Jaeger use different storage formats - migration requires custom tooling
3. **UI Training**: Phoenix UI is different from Jaeger - plan for team training
4. **Feature Parity**: Verify Phoenix supports your required features before full migration

## Support

For issues and questions:
- GitHub Issues: [Arize Phoenix Issues](https://github.com/Arize-ai/phoenix/issues)
- Documentation: [Arize Phoenix Docs](https://arize.com/docs/phoenix)
- Community: [Arize Community Slack](https://join.slack.com/t/arize-ai/shared_invite/)
