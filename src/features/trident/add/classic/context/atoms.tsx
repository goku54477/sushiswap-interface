import { ConstantProductPool, Currency, CurrencyAmount, JSBI, Percent, Price } from '@sushiswap/sdk'
import { ONE_HUNDRED_PERCENT, ZERO_PERCENT } from '../../../../../constants'
import { TransactionResponseLight, useTransactionAdder } from '../../../../../state/transactions/hooks'
import { atom, selector, useRecoilCallback, useSetRecoilState } from 'recoil'
import {
  attemptingTxnAtom,
  currenciesAtom,
  fixedRatioAtom,
  noLiquiditySelector,
  poolBalanceAtom,
  showReviewAtom,
  totalSupplyAtom,
  txHashAtom,
} from '../../../context/atoms'
import { calculateGasMargin, calculateSlippageAmount, tryParseAmount } from '../../../../../functions'
import { useActiveWeb3React, useTridentRouterContract } from '../../../../../hooks'

import { BigNumber } from '@ethersproject/bignumber'
import { ConstantProductPoolState } from '../../../../../hooks/useTridentClassicPools'
import { Field } from '../../../../../state/trident/add/classic'
import ReactGA from 'react-ga'
import { t } from '@lingui/macro'
import { useCallback } from 'react'
import { useLingui } from '@lingui/react'
import useTransactionDeadline from '../../../../../hooks/useTransactionDeadline'
import { useUserSlippageToleranceWithDefault } from '../../../../../state/user/hooks'

const ZERO = JSBI.BigInt(0)
const DEFAULT_ADD_V2_SLIPPAGE_TOLERANCE = new Percent(50, 10_000)

export const poolAtom = atom<[ConstantProductPoolState, ConstantProductPool | null]>({
  key: 'poolAtom',
  default: [null, null],
})

export const inputFieldAtom = atom<Field>({
  key: 'inputFieldAtom',
  default: Field.CURRENCY_A,
})

export const selectedZapCurrencyAtom = atom<Currency>({
  key: 'selectedZapCurrencyAtom',
  default: null,
})

export const zapInputAtom = atom<string>({
  key: 'zapInputAtom',
  default: '',
})

export const mainInputAtom = atom<string>({
  key: 'mainInputAtom',
  default: '',
})

export const secondaryInputAtom = atom<string>({
  key: 'secondaryInputAtom',
  default: '',
})

export const mainInputCurrencyAmountSelector = selector<CurrencyAmount<Currency>>({
  key: 'mainInputCurrencyAmountSelector',
  get: ({ get }) => {
    const value = get(mainInputAtom)
    const currencies = get(currenciesAtom)
    return tryParseAmount(value, currencies[0]?.wrapped)
  },
})

export const secondaryInputSelector = selector<string>({
  key: 'secondaryInputSelector',
  get: ({ get }) => {
    return get(secondaryInputCurrencyAmountSelector)?.toExact()
  },
  set: ({ get, set }, newValue: string) => {
    const currencies = get(currenciesAtom)
    const tokenAmount = tryParseAmount(newValue, currencies[1]?.wrapped)

    if (tokenAmount?.greaterThan(ZERO)) {
      set(secondaryInputCurrencyAmountSelector, tokenAmount)
      set(secondaryInputAtom, newValue)
    } else {
      set(mainInputAtom, newValue)
      set(secondaryInputAtom, newValue)
    }
  },
})

export const secondaryInputCurrencyAmountSelector = selector<CurrencyAmount<Currency>>({
  key: 'secondaryInputCurrencyAmountSelector',
  get: ({ get }) => {
    const [, pool] = get(poolAtom)
    const mainInputCurrencyAmount = get(mainInputCurrencyAmountSelector)
    const noLiquidity = get(noLiquiditySelector)
    const fixedRatio = get(fixedRatioAtom)

    // we wrap the currencies just to get the price in terms of the other token
    if (!noLiquidity) {
      if (fixedRatio) {
        const [tokenA, tokenB] = [pool?.token0?.wrapped, pool?.token1?.wrapped]
        if (tokenA && tokenB && mainInputCurrencyAmount?.wrapped && pool) {
          const dependentTokenAmount = pool.priceOf(tokenA).quote(mainInputCurrencyAmount?.wrapped)
          return pool?.token1?.isNative
            ? CurrencyAmount.fromRawAmount(pool?.token1, dependentTokenAmount.quotient)
            : dependentTokenAmount
        }
      } else {
        return tryParseAmount(get(secondaryInputAtom), pool?.token1)
      }
    }

    return undefined
  },
  set: ({ set, get }, newValue: CurrencyAmount<Currency>) => {
    const [, pool] = get(poolAtom)
    const noLiquidity = get(noLiquiditySelector)
    const fixedRatio = get(fixedRatioAtom)

    if (!noLiquidity) {
      if (fixedRatio) {
        const [tokenA, tokenB] = [pool?.token0?.wrapped, pool?.token1?.wrapped]
        if (tokenA && tokenB && newValue?.wrapped && pool) {
          const dependentTokenAmount = pool.priceOf(tokenB).quote(newValue?.wrapped)
          set(mainInputAtom, dependentTokenAmount?.toExact())
        }
      }
    }

    return undefined
  },
})

export const formattedAmountsSelector = selector<[string, string]>({
  key: 'formattedAmountsSelector',
  get: ({ get }) => {
    const inputField = get(inputFieldAtom)
    const [parsedAmountA, parsedAmountB] = get(parsedAmountsSelector)
    return [
      inputField === Field.CURRENCY_A ? parsedAmountA?.toExact() ?? '' : parsedAmountA?.toSignificant(6) ?? '',
      inputField === Field.CURRENCY_B ? parsedAmountB?.toExact() ?? '' : parsedAmountB?.toSignificant(6) ?? '',
    ]
  },
})

export const parsedZapAmountSelector = selector<CurrencyAmount<Currency>>({
  key: 'parsedZapAmount',
  get: ({ get }) => {
    const value = get(zapInputAtom)
    const currency = get(selectedZapCurrencyAtom)
    return tryParseAmount(value, currency)
  },
})

export const parsedZapSplitAmountsSelector = selector<[CurrencyAmount<Currency>, CurrencyAmount<Currency>]>({
  key: 'parsedZapSlitAmountsSelector',
  get: ({ get }) => {
    const inputAmount = get(parsedZapAmountSelector)
    return [null, null]
  },
})

// Derive parsedAmounts from formattedAmounts
export const parsedAmountsSelector = selector<[CurrencyAmount<Currency>, CurrencyAmount<Currency>]>({
  key: 'parsedAmountsSelector',
  get: ({ get }) => {
    const inputField = get(inputFieldAtom)
    const [, pool] = get(poolAtom)
    return [
      inputField === Field.CURRENCY_A
        ? tryParseAmount(get(mainInputAtom), pool?.token0)
        : get(mainInputCurrencyAmountSelector),
      inputField === Field.CURRENCY_B
        ? tryParseAmount(get(secondaryInputAtom), pool?.token1)
        : get(secondaryInputCurrencyAmountSelector),
    ]
  },
})

export const liquidityMintedSelector = selector({
  key: 'liquidityMintedSelector',
  get: ({ get }) => {
    const [currencyAAmount, currencyBAmount] = get(parsedAmountsSelector)
    const [, pool] = get(poolAtom)
    const totalSupply = get(totalSupplyAtom)

    const [tokenAmountA, tokenAmountB] = [currencyAAmount?.wrapped, currencyBAmount?.wrapped]
    if (pool && totalSupply && tokenAmountA && tokenAmountB) {
      try {
        return pool.getLiquidityMinted(totalSupply?.wrapped, tokenAmountA, tokenAmountB)
      } catch (error) {
        console.error(error)
      }
    }

    return undefined
  },
})

export const poolShareSelector = selector({
  key: 'poolShareSelector',
  get: ({ get }) => {
    const liquidityMinted = get(liquidityMintedSelector)
    const totalSupply = get(totalSupplyAtom)

    if (liquidityMinted && totalSupply) {
      return new Percent(liquidityMinted.quotient, totalSupply.add(liquidityMinted).quotient)
    }

    return undefined
  },
})

export const priceSelector = selector<Price<Currency, Currency>>({
  key: 'priceSelector',
  get: ({ get }) => {
    const noLiquidity = get(noLiquiditySelector)
    const [currencyAAmount, currencyBAmount] = get(parsedAmountsSelector)

    if (noLiquidity) {
      if (currencyAAmount?.greaterThan(0) && currencyBAmount?.greaterThan(0)) {
        const value = currencyBAmount.divide(currencyAAmount)
        return new Price(currencyAAmount.currency, currencyBAmount.currency, value.denominator, value.numerator)
      }
    } else {
      const [, pool] = get(poolAtom)
      return pool && currencyAAmount?.wrapped ? pool.priceOf(currencyAAmount?.currency.wrapped) : undefined
    }
    return undefined
  },
})

export const priceImpactSelector = selector({
  key: 'priceImpactSelector',
  get: ({ get }) => {
    const [currencyAAmount, currencyBAmount] = get(parsedAmountsSelector)
    const [wrappedAAmount, wrappedBAmount] = [currencyAAmount?.wrapped, currencyBAmount?.wrapped]

    if (!wrappedAAmount || !wrappedBAmount) return undefined
    if (!currencyAAmount.currency.equals(currencyBAmount.currency)) return undefined
    if (JSBI.equal(wrappedAAmount.quotient, JSBI.BigInt(0))) return undefined
    const pct = ONE_HUNDRED_PERCENT.subtract(wrappedBAmount.divide(wrappedAAmount))
    return new Percent(pct.numerator, pct.denominator)
  },
})

export const currentLiquidityValueSelector = selector({
  key: 'currentLiquidityValueSelector',
  get: ({ get }) => {
    const [, pool] = get(poolAtom)
    const poolBalance = get(poolBalanceAtom)
    const totalSupply = get(totalSupplyAtom)

    if (pool && poolBalance && totalSupply) {
      return [
        pool.getLiquidityValue(pool.token0, totalSupply?.wrapped, poolBalance?.wrapped),
        pool.getLiquidityValue(pool.token1, totalSupply?.wrapped, poolBalance?.wrapped),
      ]
    }

    return undefined
  },
})

export const liquidityValueSelector = selector({
  key: 'liquidityValueSelector',
  get: ({ get }) => {
    const [, pool] = get(poolAtom)
    const [currencyAAmount, currencyBAmount] = get(parsedAmountsSelector)

    if (pool && currencyAAmount && currencyBAmount) {
      const [currentAAmount, currentBAmount] = get(currentLiquidityValueSelector)
      return [currencyAAmount.add(currentAAmount), currencyBAmount.add(currentBAmount)]
    }

    return undefined
  },
})

export const useClassicAddExecute = () => {
  const { i18n } = useLingui()
  const { chainId, library, account } = useActiveWeb3React()
  const deadline = useTransactionDeadline()
  const allowedSlippage = useUserSlippageToleranceWithDefault(DEFAULT_ADD_V2_SLIPPAGE_TOLERANCE) // custom from users
  const addTransaction = useTransactionAdder()
  const router = useTridentRouterContract()
  const setAttemptingTxn = useSetRecoilState(attemptingTxnAtom)
  const setTxHash = useSetRecoilState(txHashAtom)
  const setShowReview = useSetRecoilState(showReviewAtom)

  const standardModeExecute = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const noLiquidity = await snapshot.getPromise(noLiquiditySelector)
        const [currencyA, currencyB] = await snapshot.getPromise(currenciesAtom)
        const [parsedAmountA, parsedAmountB] = await snapshot.getPromise(parsedAmountsSelector)

        if (
          !chainId ||
          !library ||
          !account ||
          !router ||
          !parsedAmountA ||
          !parsedAmountB ||
          !currencyA ||
          !currencyB ||
          !deadline
        )
          return

        const amountsMin = {
          [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? ZERO_PERCENT : allowedSlippage)[0],
          [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? ZERO_PERCENT : allowedSlippage)[0],
        }

        let estimate
        let method: (...args: any) => Promise<TransactionResponseLight>
        let args: Array<string | string[] | number>
        let value: BigNumber | null

        if (currencyA.isNative || currencyB.isNative) {
          const tokenBIsETH = currencyB.isNative
          estimate = router.estimateGas.addLiquidityETH
          method = router.addLiquidityETH
          args = [
            (tokenBIsETH ? currencyA : currencyB)?.wrapped?.address ?? '', // token
            (tokenBIsETH ? parsedAmountA : parsedAmountB).quotient.toString(), // token desired
            amountsMin[tokenBIsETH ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
            amountsMin[tokenBIsETH ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
            account,
            deadline.toHexString(),
          ]
          value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).quotient.toString())
        } else {
          estimate = router.estimateGas.addLiquidity
          method = router.addLiquidity
          args = [
            currencyA?.wrapped?.address ?? '',
            currencyB?.wrapped?.address ?? '',
            parsedAmountA.quotient.toString(),
            parsedAmountB.quotient.toString(),
            amountsMin[Field.CURRENCY_A].toString(),
            amountsMin[Field.CURRENCY_B].toString(),
            account,
            deadline.toHexString(),
          ]
          value = null
        }

        try {
          setAttemptingTxn(true)
          const estimatedGasLimit = await estimate(...args, value ? { value } : {})
          const response = await method(...args, {
            ...(value ? { value } : {}),
            gasLimit: calculateGasMargin(estimatedGasLimit),
          })
          setAttemptingTxn(false)

          addTransaction(response, {
            summary: i18n._(
              t`Add ${parsedAmountA?.toSignificant(3)} ${currencyA?.symbol} and ${parsedAmountB?.toSignificant(3)} ${
                currencyB?.symbol
              }`
            ),
          })

          setTxHash(response.hash)
          setShowReview(false)

          ReactGA.event({
            category: 'Liquidity',
            action: 'Add',
            label: [currencyA?.symbol, currencyB?.symbol].join('/'),
          })
        } catch (error) {
          setAttemptingTxn(false)
          // we only care if the error is something _other_ than the user rejected the tx
          if (error?.code !== 4001) {
            console.error(error)
          }
        }
      },
    [
      account,
      addTransaction,
      allowedSlippage,
      chainId,
      deadline,
      i18n,
      library,
      router,
      setAttemptingTxn,
      setShowReview,
      setTxHash,
    ]
  )

  const zapModeExecute = useCallback(() => {
    setShowReview(false)
  }, [])

  return {
    standardModeExecute,
    zapModeExecute,
  }
}
