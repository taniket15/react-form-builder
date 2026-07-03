import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { FormInstance } from '../types'
import { loadInstances, saveInstances } from '../storage/localStorage'

type InstancesAction = { type: 'CREATE'; instance: FormInstance }

function instancesReducer(
  state: FormInstance[],
  action: InstancesAction,
): FormInstance[] {
  switch (action.type) {
    case 'CREATE':
      return [...state, action.instance]
  }
}

interface InstancesContextValue {
  instances: FormInstance[]
  createInstance: (instance: FormInstance) => void
}

const InstancesContext = createContext<InstancesContextValue | null>(null)

export function InstancesProvider({ children }: { children: ReactNode }) {
  const [instances, dispatch] = useReducer(instancesReducer, undefined, loadInstances)

  useEffect(() => {
    saveInstances(instances)
  }, [instances])

  const value: InstancesContextValue = {
    instances,
    createInstance: (instance) => dispatch({ type: 'CREATE', instance }),
  }

  return (
    <InstancesContext.Provider value={value}>{children}</InstancesContext.Provider>
  )
}

export function useInstances(): InstancesContextValue {
  const ctx = useContext(InstancesContext)
  if (!ctx) throw new Error('useInstances must be used within an InstancesProvider')
  return ctx
}
