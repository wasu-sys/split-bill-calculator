param(
  [Parameter(Mandatory = $true)]
  [string]$SourceAccount,
  [ValidateSet('testnet', 'mainnet')]
  [string]$Network = 'testnet'
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifest = Join-Path $repoRoot 'soroban\Cargo.toml'
$wasm = Join-Path $repoRoot 'soroban\target\wasm32v1-none\release\split_bill_contract.wasm'

cargo build --manifest-path $manifest --target wasm32v1-none --release
if ($LASTEXITCODE -ne 0) { throw 'Soroban contract build failed.' }

stellar contract deploy --wasm $wasm --source-account $SourceAccount --network $Network
if ($LASTEXITCODE -ne 0) { throw 'Soroban contract deployment failed.' }
