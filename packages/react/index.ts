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
export default {
	version: '1.0.0',
	createElement: jsxDEV
};
