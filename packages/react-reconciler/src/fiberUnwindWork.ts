import { FiberNode } from './fiber';
import { popProvider } from './fiberContext';
import { DidCapture, noFLags, ShouldCapture } from './fiberFlags';
import { popSuspenseHandler } from './suspenseContext';
import { ContextProvider, SuspenseComponent } from './workTag';

export function unwindWork(wip: FiberNode) {
	const flags = wip.flags;
	switch (wip.tag) {
		case SuspenseComponent:
			popSuspenseHandler();
			if (
				(flags & ShouldCapture) !== noFLags &&
				(flags & DidCapture) === noFLags
			) {
				wip.flags = (flags & ~ShouldCapture) | DidCapture;
				return wip;
			}
			return null;
		case ContextProvider:
			const context = wip.type._context;
			popProvider(context);
			return null;
		default:
			return null;
	}
}
