# BCM MCP Server

An [MCP server](https://modelcontextprotocol.io) that lets Claude and other AI agents query the [BCM Registry](https://bcmspec.org) — look up how to transact with any company.

## What it does

Before an AI agent submits an invoice, sends a PO, or initiates any B2B transaction, it can query the BCM Registry to learn the target company's requirements: accepted formats, required fields, approval limits, and where to send it.

## Install

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bcm-registry": {
      "command": "npx",
      "args": ["-y", "bcm-mcp-server"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add bcm-registry -- npx -y bcm-mcp-server
```

## Tools

### `lookup_bcm`

Look up a company's BCM for a specific transaction type.

```
lookup_bcm({ domain: "acme.com", transaction_type: "invoice_submission" })
```

Returns accepted formats, required fields, approval limits, submission endpoints, compliance requirements, and response SLAs.

### `list_transaction_types`

List all supported transaction types.

## Resources

### `bcm://spec`

The BCM specification summary — gives the agent full context on the standard.

## License

Apache 2.0
