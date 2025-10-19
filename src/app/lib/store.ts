import { configureStore, type Reducer, type AnyAction, combineReducers } from '@reduxjs/toolkit'

// Start with an empty reducer map.
// Add your feature reducers here later, e.g. { auth: authReducer, todos: todosReducer }
const staticReducers: Record<string, Reducer<any, AnyAction>> = {
    
}

const rootReducer = combineReducers(staticReducers)

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    // middleware: (getDefault) => getDefault().concat(/* your middleware */),
    // devTools: process.env.NODE_ENV !== 'production',
  })

// Types based on the (currently empty) store
export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type RootState = ReturnType<AppStore['getState']>
