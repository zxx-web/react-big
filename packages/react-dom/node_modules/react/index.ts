import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsxDEV } from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};
export const __SECRET_INTERNALS__ = {
	currentDispatcher
};

export const version = '1.0.0';
export const createElement = jsxDEV;
