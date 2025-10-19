'use client'

import { PropsWithChildren, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/app/lib/store'
import { useMemo } from 'react'   

export default function ReduxProvider({ children }: PropsWithChildren) {
  const store: AppStore = useMemo(() => makeStore(), [])
  return <Provider store={store}>{children}</Provider>
}