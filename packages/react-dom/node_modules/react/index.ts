import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import CurrentBatchConfig from './src/currentBatchConfig';
import { jsxDEV } from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};
export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};
export const useTransition: Dispatcher['useTransition'] = () => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useTransition();
};
export const __SECRET_INTERNALS__ = {
	currentDispatcher,
	CurrentBatchConfig
};

export const version = '1.0.0';
export const createElement = jsxDEV;
