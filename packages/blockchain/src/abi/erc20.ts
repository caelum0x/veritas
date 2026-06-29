// ERC20 ABI fragments for balanceOf, transfer, approve, allowance, and Transfer event

export interface AbiFragment {
  readonly name: string;
  readonly type: "function" | "event";
  readonly inputs: readonly AbiInput[];
  readonly outputs?: readonly AbiOutput[];
  readonly stateMutability?: "pure" | "view" | "nonpayable" | "payable";
}

export interface AbiInput {
  readonly name: string;
  readonly type: string;
  readonly indexed?: boolean;
}

export interface AbiOutput {
  readonly name: string;
  readonly type: string;
}

export const ERC20_BALANCE_OF: AbiFragment = {
  name: "balanceOf",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
};

export const ERC20_TRANSFER: AbiFragment = {
  name: "transfer",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
};

export const ERC20_APPROVE: AbiFragment = {
  name: "approve",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "spender", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
};

export const ERC20_ALLOWANCE: AbiFragment = {
  name: "allowance",
  type: "function",
  stateMutability: "view",
  inputs: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
  ],
  outputs: [{ name: "", type: "uint256" }],
};

export const ERC20_TOTAL_SUPPLY: AbiFragment = {
  name: "totalSupply",
  type: "function",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "uint256" }],
};

export const ERC20_DECIMALS: AbiFragment = {
  name: "decimals",
  type: "function",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "uint8" }],
};

export const ERC20_NAME: AbiFragment = {
  name: "name",
  type: "function",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "string" }],
};

export const ERC20_SYMBOL: AbiFragment = {
  name: "symbol",
  type: "function",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "string" }],
};

export const ERC20_TRANSFER_EVENT: AbiFragment = {
  name: "Transfer",
  type: "event",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
};

export const ERC20_APPROVAL_EVENT: AbiFragment = {
  name: "Approval",
  type: "event",
  inputs: [
    { name: "owner", type: "address", indexed: true },
    { name: "spender", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
};

export const ERC20_ABI: readonly AbiFragment[] = [
  ERC20_BALANCE_OF,
  ERC20_TRANSFER,
  ERC20_APPROVE,
  ERC20_ALLOWANCE,
  ERC20_TOTAL_SUPPLY,
  ERC20_DECIMALS,
  ERC20_NAME,
  ERC20_SYMBOL,
  ERC20_TRANSFER_EVENT,
  ERC20_APPROVAL_EVENT,
] as const;
