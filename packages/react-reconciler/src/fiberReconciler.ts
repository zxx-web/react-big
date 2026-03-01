import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTag';
import { createUpdate, createUpdateQueue, enqueueUpdate } from './updateQueue';
import type { UpdateQueue } from './updateQueue';
import type { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLane } from './fiberLanes';
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority
} from 'scheduler';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}
export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const hostRootFiber = root.current;
		const lane = requestUpdateLane();
		const update = createUpdate<ReactElementType | null>(element, lane);
		enqueueUpdate(
			hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
			update,
			hostRootFiber,
			lane
		);
		scheduleUpdateOnFiber(hostRootFiber, lane);
	});
}
