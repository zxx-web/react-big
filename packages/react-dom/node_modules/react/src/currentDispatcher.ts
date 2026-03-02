import { HookDeps } from 'react-reconciler/src/fiberHooks';
import { Action, ReactContext, Usable } from 'shared/ReactTypes';

export interface Dispatcher {
	useState: <T>(initialState: () => T | T) => [T, Dispatch<T>];
	useEffect: (callback: () => void | void, deps: HookDeps | undefined) => void;
	useTransition: () => [boolean, (callback: () => void) => void];
	useRef: <T>(initialValue: T) => { current: T };
	useContext: <T>(context: ReactContext<T>) => T;
	use: <T>(usable: Usable<T>) => T;
	useCallback: <T>(callback: T, deps: HookDeps | undefined) => T;
	useMemo: <T>(nextCreate: () => T, deps: HookDeps | undefined) => T;
}

export type Dispatch<T> = (action: Action<T>) => void;

const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	if (dispatcher === null) {
		throw new Error('hooks只能在函数组件中使用');
	}
	return dispatcher;
};
export default currentDispatcher;
