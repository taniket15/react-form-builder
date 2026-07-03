import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { FormResponse } from '../types'
import { loadResponses, saveResponses } from '../storage/localStorage'

type ResponsesAction = { type: 'CREATE'; response: FormResponse }

function responsesReducer(
  state: FormResponse[],
  action: ResponsesAction,
): FormResponse[] {
  switch (action.type) {
    case 'CREATE':
      return [...state, action.response]
  }
}

interface ResponsesContextValue {
  responses: FormResponse[]
  createResponse: (response: FormResponse) => void
}

const ResponsesContext = createContext<ResponsesContextValue | null>(null)

export function ResponsesProvider({ children }: { children: ReactNode }) {
  const [responses, dispatch] = useReducer(responsesReducer, undefined, loadResponses)

  useEffect(() => {
    saveResponses(responses)
  }, [responses])

  const value: ResponsesContextValue = {
    responses,
    createResponse: (response) => dispatch({ type: 'CREATE', response }),
  }

  return (
    <ResponsesContext.Provider value={value}>{children}</ResponsesContext.Provider>
  )
}

export function useResponses(): ResponsesContextValue {
  const ctx = useContext(ResponsesContext)
  if (!ctx) throw new Error('useResponses must be used within a ResponsesProvider')
  return ctx
}
