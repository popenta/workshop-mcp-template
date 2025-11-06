#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Address, DevnetEntrypoint } from '@multiversx/sdk-core/';
import z from 'zod';
import { denominateEgldValue, loadAccountFromEnv } from './utils.js';

// Create an MCP server
const server = new McpServer({
    name: 'multiversx-mcp',
    version: '1.0.0'
});

// Add tools
server.registerTool(
    'get-bech32-address',
    {
        description: "Returns the bech32 address for the wallet",
        inputSchema: {},
        outputSchema: { address: z.string().describe("The bech32 address of the wallet") },
    },
    async () => {
        const account = loadAccountFromEnv();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({address: account.address.toBech32() })
                }
            ],
            structuredContent: { address: account.address.toBech32() }
        }
    }
);

server.registerTool(
    'get-balance',
    {
        description: "Returns the balance for the wallet",
        inputSchema: {},
        outputSchema: { balance: z.string().describe("The balance of the wallet") },
    },
    async () => {
        const account = loadAccountFromEnv();
        const address = account.address;

        const entrypoint = new DevnetEntrypoint();
        const api = entrypoint.createNetworkProvider();

        const accountOnNetwork = await api.getAccount(address);
        const balance = new BigNumber(accountOnNetwork.balance.toString());
        const formattedBalance = balance.dividedBy(new BigNumber(10).pow(18)).toFixed();

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ balance: formattedBalance })
                }
            ],
            structuredContent: { balance: formattedBalance }
        }
    }
);

server.registerTool(
    'send-egld',
    {
        description: "Create a transaction to send EGLD from the wallet to a specified address",
        inputSchema: {
            to: z.string().describe("The recipient address"),
            amount: z.string().describe("The amount of EGLD to send")
        },
        outputSchema: { transactionHash: z.string().describe("The hash of the sent transaction") },
    },
    async ({to, amount}) => {
        let address: Address;

        try {
            address = Address.newFromBech32(to);
        } catch {
            return {
                content: [
                    {
                    type: "text",
                    text: "Invalid address. Please provide a valid bech32 address (erd1...)",
                    },
                ],
            };
        }

        const account = loadAccountFromEnv();

        const entrypoint = new DevnetEntrypoint();
        const api = entrypoint.createNetworkProvider();

        const accountOnNetwork = await api.getAccount(account.address);
        account.nonce = accountOnNetwork.nonce;

        const denominatedAmount = denominateEgldValue(amount);

        if (denominatedAmount > accountOnNetwork.balance) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Not enough EGLD balance",
                    },
                ],
            };
        }

        const controller = entrypoint.createTransfersController();
        const transaction = await controller.createTransactionForTransfer(
            account,
            account.nonce,
            {
                receiver: address,
                nativeAmount: denominatedAmount,
            }
        );

        const hash = await entrypoint.sendTransaction(transaction);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ transactionHash: hash })
                }
            ],
            structuredContent: { transactionHash: hash }
        }
    }
);


// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
