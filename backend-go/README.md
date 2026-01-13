# TiKV Backend Configuration

## Configuration Options

The TiKV backend supports multiple ways to configure the PD (Placement Driver) endpoints:

### 1. Configuration File (Default)

Create a `config.json` file with the following structure:

```json
{
  "tikv": {
    "pd_endpoints": [
      "172.16.0.10:2379",
      "172.16.0.20:2379",
      "172.16.0.30:2379"
    ]
  }
}
```

### 2. Environment Variables

Set the `TIKV_PD_ENDPOINTS` environment variable:

```bash
export TIKV_PD_ENDPOINTS=172.16.0.10:2379,172.16.0.20:2379,172.16.0.30:2379
```

### 3. Command Line

Use a custom config file path:

```bash
./tikv-backend --config /path/to/custom/config.json
```

### 4. No Config File (Environment Variables Only)

```bash
./tikv-backend --config /dev/null
```

## Configuration Priority

1. **Environment variables** (highest priority)
2. **Configuration file** (lower priority)
3. **Default values** (127.0.0.1:2379)

## Examples

### Development Environment
```bash
# Use environment variables for local development
TIKV_PD_ENDPOINTS=127.0.0.1:2379 ./tikv-backend
```

### Production Environment
```bash
# Use config file for production
./tikv-backend --config production.json
```

### Docker/Kubernetes
```bash
# Set via environment variables in container
docker run -e TIKV_PD_ENDPOINTS=172.16.0.10:2379,172.16.0.20:2379 tikv-backend
```

## Default Configuration

If no configuration is provided, the application will use:
- **PD Endpoints**: `127.0.0.1:2379` (single local PD endpoint)