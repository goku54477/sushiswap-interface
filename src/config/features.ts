import { ChainId } from '@sushiswap/core-sdk'
import { Feature } from 'app/enums'

type FeatureMap = { readonly [chainId in ChainId]?: Feature[] }

const features: FeatureMap = {
  [ChainId.ETHEREUM]: [
    Feature.AMM,
    Feature.LIQUIDITY_MINING,
    Feature.BENTOBOX,
    Feature.KASHI,
    Feature.MIGRATE,
    Feature.ANALYTICS,
    Feature.STAKING,
    Feature.MISO,
    Feature.MEOWSHI,
    Feature.INARI,
    Feature.VESTING,
    Feature.LIMIT_ORDERS,
    Feature.SUSHIGUARD,
  ],
  [ChainId.ROPSTEN]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.BENTOBOX, Feature.KASHI, Feature.MISO],
  [ChainId.RINKEBY]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.BENTOBOX, Feature.KASHI, Feature.MISO],
  [ChainId.GÖRLI]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.BENTOBOX, Feature.KASHI, Feature.MISO],
  [ChainId.KOVAN]: [
    Feature.AMM,
    Feature.LIQUIDITY_MINING,
    Feature.BENTOBOX,
    Feature.KASHI,
    Feature.MISO,
    Feature.TRIDENT,
  ],
  [ChainId.BSC]: [Feature.AMM, Feature.BENTOBOX, Feature.KASHI, Feature.MIGRATE, Feature.ANALYTICS, Feature.MISO],
  [ChainId.BSC_TESTNET]: [Feature.AMM],
  [ChainId.FANTOM]: [
    Feature.AMM,
    Feature.ANALYTICS,
    Feature.LIMIT_ORDERS,
    Feature.LIQUIDITY_MINING,
    Feature.BENTOBOX,
    Feature.MISO,
    Feature.MIGRATE,
  ],
  [ChainId.FANTOM_TESTNET]: [Feature.AMM],
  [ChainId.MATIC]: [
    Feature.AMM,
    Feature.LIQUIDITY_MINING,
    Feature.BENTOBOX,
    Feature.KASHI,
    Feature.MIGRATE,
    Feature.ANALYTICS,
    Feature.LIMIT_ORDERS,
    Feature.TRIDENT,
    Feature.TRIDENT_MIGRATION,
    Feature.MISO,
  ],
  [ChainId.MATIC_TESTNET]: [Feature.AMM],
  [ChainId.HARMONY]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.ANALYTICS, Feature.MISO],
  [ChainId.HARMONY_TESTNET]: [Feature.AMM],
  [ChainId.AVALANCHE]: [
    Feature.AMM,
    Feature.BENTOBOX,
    // Feature.KASHI,
    Feature.LIMIT_ORDERS,
    Feature.ANALYTICS,
    Feature.MISO,
    Feature.MIGRATE,
  ],
  [ChainId.AVALANCHE_TESTNET]: [Feature.AMM],
  [ChainId.OKEX]: [Feature.AMM],
  [ChainId.OKEX_TESTNET]: [Feature.AMM],
  [ChainId.XDAI]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.ANALYTICS, Feature.BENTOBOX, Feature.KASHI],
  [ChainId.MOONRIVER]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.ANALYTICS, Feature.MISO],
  [ChainId.CELO]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.ANALYTICS],
  [ChainId.ARBITRUM]: [
    Feature.AMM,
    Feature.LIQUIDITY_MINING,
    Feature.ANALYTICS,
    Feature.BENTOBOX,
    Feature.KASHI,
    Feature.MISO,
  ],
  [ChainId.FUSE]: [Feature.AMM, Feature.LIQUIDITY_MINING, Feature.ANALYTICS],
  [ChainId.MOONBEAM]: [Feature.AMM, Feature.MISO, Feature.LIQUIDITY_MINING, Feature.MIGRATE],
  [ChainId.OPTIMISM]: [Feature.TRIDENT, Feature.BENTOBOX],
  [ChainId.KAVA]: [Feature.TRIDENT, Feature.BENTOBOX, Feature.LIQUIDITY_MINING],
  [ChainId.METIS]: [Feature.TRIDENT, Feature.BENTOBOX, Feature.LIQUIDITY_MINING],
  [ChainId.ARBITRUM_NOVA]: [Feature.AMM],
}

export default features
