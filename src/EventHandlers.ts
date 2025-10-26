/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */

// Import handlers - they will auto-register when imported
import "./handlers/transfer-handler";
import "./handlers/swap-handler";

// Note: Other event handlers are not implemented yet.
// You can implement them following the same pattern:
// - Create a new file in ./handlers/
// - Import it here
// - The handler will auto-register

// Unimplemented handlers for reference:
// - Ping.Approval
// - Ping.AuthorizationCanceled
// - Ping.AuthorizationUsed
// - Ping.EIP712DomainChanged
// - Ping.FeesCollected
// - Ping.LiquidityDeployed
// - Ping.OwnershipTransferred
// - Ping.RoleAdminChanged
// - Ping.RoleGranted
// - Ping.RoleRevoked
// - UniswapV3Pool.Burn
// - UniswapV3Pool.Collect
// - UniswapV3Pool.CollectProtocol
// - UniswapV3Pool.Flash
// - UniswapV3Pool.IncreaseObservationCardinalityNext
// - UniswapV3Pool.Initialize
// - UniswapV3Pool.Mint
// - UniswapV3Pool.SetFeeProtocol
