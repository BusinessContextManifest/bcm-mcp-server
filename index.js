#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BCM_REGISTRY_URL = "https://bcmspec.org";

const server = new McpServer({
  name: "bcm-registry",
  version: "1.0.0",
});

// Tool: Look up a company's BCM for a specific transaction type
server.tool(
  "lookup_bcm",
  "Look up a company's Business Context Manifest for a specific transaction type. Returns accepted formats, required fields, approval limits, submission endpoints, compliance requirements, and response SLAs.",
  {
    domain: z.string().describe("Company domain (e.g. 'acme.com')"),
    transaction_type: z.enum([
      "invoice_submission",
      "purchase_order",
      "rfq_response",
      "vendor_qualification",
      "compliance_attestation",
      "contract_amendment",
      "delivery_confirmation",
      "payment_terms",
    ]).describe("Type of B2B transaction"),
  },
  async ({ domain, transaction_type }) => {
    // 1. Try the company's own .well-known/bcm.json first
    try {
      const wellKnownUrl = `https://${domain}/.well-known/bcm.json`;
      const wkRes = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(5000) });

      if (wkRes.ok) {
        const wkData = await wkRes.json();

        if (
          wkData &&
          typeof wkData.transaction_types === "object" &&
          wkData.transaction_types !== null &&
          wkData.transaction_types[transaction_type]
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(wkData.transaction_types[transaction_type], null, 2),
              },
            ],
          };
        }
        // .well-known exists but doesn't contain this transaction type — fall through to registry
      }
    } catch {
      // .well-known fetch failed (404, network error, timeout, invalid JSON, etc.) — fall through silently
    }

    // 2. Fall back to the central BCM registry
    const url = `${BCM_REGISTRY_URL}/api/bcm/${encodeURIComponent(domain)}/${encodeURIComponent(transaction_type)}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        return {
          content: [
            {
              type: "text",
              text: `No BCM found for ${domain} / ${transaction_type}. ${data.hint || "This company may not be in the registry yet."}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying BCM registry: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List available transaction types
server.tool(
  "list_transaction_types",
  "List all supported BCM transaction types and what they're used for.",
  {},
  async () => {
    const types = [
      { value: "invoice_submission", description: "How to submit invoices to this company" },
      { value: "purchase_order", description: "How to send purchase orders" },
      { value: "rfq_response", description: "How to respond to requests for quote" },
      { value: "vendor_qualification", description: "Requirements to become a vendor" },
      { value: "compliance_attestation", description: "How to submit compliance documents" },
      { value: "contract_amendment", description: "How to request contract changes" },
      { value: "delivery_confirmation", description: "How to confirm deliveries" },
      { value: "payment_terms", description: "Payment preferences and terms" },
    ];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  }
);

// Resource: BCM spec documentation
server.resource(
  "bcm-spec",
  "bcm://spec",
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: `Business Context Manifest (BCM) Specification v1.0

A BCM is a structured JSON document that tells AI agents how to transact with a company.

Discovery: Companies can self-host at https://{domain}/.well-known/bcm.json
Fallback API: GET https://bcmspec.org/api/bcm/{domain}/{transaction_type}

Transaction Types:
- invoice_submission: How to submit invoices
- purchase_order: How to send POs
- rfq_response: How to respond to RFQs
- vendor_qualification: Vendor onboarding requirements
- compliance_attestation: Compliance submissions
- contract_amendment: Contract change requests
- delivery_confirmation: Delivery confirmations
- payment_terms: Payment preferences

BCM Fields:
- accepted_formats: Document formats accepted (PDF, UBL 2.1, EDI, etc.)
- required_fields: Fields that must be present in submissions
- authority_limits: Dollar thresholds for auto-approve, manager approval, etc.
- compliance_requirements: Prerequisites (W9, MSA, NDA, etc.)
- submission_endpoint: Where and how to send documents
- response_sla: Expected response times
- escalation_path: Who to contact if no response
- data_residency: Where data must be stored

Registry: https://bcmspec.org
Spec: https://github.com/BusinessContextManifest/bcm-spec`,
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
