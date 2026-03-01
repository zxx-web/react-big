import { ReactElementType } from 'shared/ReactTypes';
import {
	createFiberFromFragment,
	createFiberFromOffscreen,
	type FiberNode,
	type OffscreenProps
} from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffscreenComponent,
	SuspenseComponent
} from './workTag';
import {
	cloneChildFibers,
	mountChildFibers,
	reconcileChildFibers
} from './childFibers';
import { bailoutHook, renderWithHooks } from './fiberHooks';
import { includeSomeLanes, Lane, NoLanes } from './fiberLanes';
import {
	childDeletion,
	DidCapture,
	noFLags,
	placement,
	Ref
} from './fiberFlags';
import { pushProvider } from './fiberContext';
import { createWorkInProgress } from './workLoop';
import { pushSuspenseHandler } from './suspenseContext';

let didReceiveUpdate = false;

export function markWipReceivedUpdate() {
	didReceiveUpdate = true;
}

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	// bailout 策略
	didReceiveUpdate = false;
	const current = wip.alternate;
	if (current !== null) {
		const oldProps = current.memoizedProps;
		const newProps = wip.pendingProps;
		if (oldProps !== newProps || current.type !== wip.type) {
			didReceiveUpdate = true;
		} else {
			const hasScheduledStateOrContext = checkScheduledUpdateOrContext(
				current,
				renderLane
			);
			if (!hasScheduledStateOrContext) {
				didReceiveUpdate = false;
				switch (wip.tag) {
					case ContextProvider:
						const providerType = wip.type;
						const context = providerType._context;

						const newProps = wip.pendingProps;
						pushProvider(context, newProps.value);
						break;
				}
				return bailoutOnAlreadyFinishedWork(wip, renderLane);
			}
		}
	}

	wip.lanes = NoLanes;
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
		case ContextProvider:
			return updateContextProvider(wip);
		case SuspenseComponent:
			return updateSuspenseComponent(wip);
		case OffscreenComponent:
			return updateOffscreenComponent(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			return null;
	}
};

function bailoutOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
	if (!includeSomeLanes(wip.childLanes, renderLane)) {
		if (__DEV__) {
			console.warn('bailout整棵子树', wip);
		}
		return null;
	}
	if (__DEV__) {
		console.warn('bailout当前节点', wip);
	}
	cloneChildFibers(wip);
	return wip.child;
}

function checkScheduledUpdateOrContext(
	current: FiberNode,
	renderLane: Lane
): boolean {
	const updateLans = current.lanes;
	if (includeSomeLanes(updateLans, renderLane)) {
		return true;
	}
	return false;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const update = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const prevChildren = wip.memoizedState;
	const { memoizedState } = processUpdateQueue(baseState, update, renderLane);
	wip.memoizedState = memoizedState;

	const current = wip.alternate;
	if (current !== null) {
		if (!current.memoizedState) {
			current.memoizedState = memoizedState;
		}
	}

	const nextChildren = wip.memoizedState;
	if (prevChildren === nextChildren) {
		return bailoutOnAlreadyFinishedWork(wip, renderLane);
	}
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	markRef(wip.alternate, wip);
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);
	const current = wip.alternate;
	if (current !== null && !didReceiveUpdate) {
		bailoutHook(wip, renderLane);
		return bailoutOnAlreadyFinishedWork(wip, renderLane);
	}
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateContextProvider(wip: FiberNode) {
	const providerType = wip.type;
	const context = providerType._context;

	const newProps = wip.pendingProps;
	pushProvider(context, newProps.value);
	const nextChildren = newProps.children;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateOffscreenComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateSuspenseComponent(wip: FiberNode) {
	const current = wip.alternate;
	const nextProps = wip.pendingProps;

	let showFallback = false;
	const didSuspense = (wip.flags & DidCapture) !== noFLags;

	if (didSuspense) {
		showFallback = true;
		wip.flags &= ~DidCapture;
	}

	const nextPrimaryChildren = nextProps.children;
	const nextFallbackChildren = nextProps.fallback;
	pushSuspenseHandler(wip);
	if (current === null) {
		if (showFallback) {
			return mountSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return mountSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	} else {
		if (showFallback) {
			return updateSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return updateSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	}
}
function updateSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const current = wip.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};
	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);

	primaryChildFragment.return = wip;
	primaryChildFragment.sibling = null;
	wip.child = primaryChildFragment;

	if (currentFallbackChildFragment !== null) {
		const deletions = wip.deletions;
		if (deletions === null) {
			wip.deletions = [currentFallbackChildFragment];
			wip.flags |= childDeletion;
		} else {
			deletions.push(currentFallbackChildFragment);
		}
	}

	return primaryChildFragment;
}
function updateSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = wip.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};
	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);
	let fallbackChildFragment;
	if (currentFallbackChildFragment !== null) {
		fallbackChildFragment = createWorkInProgress(
			currentFallbackChildFragment,
			fallbackChildren
		);
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

		fallbackChildFragment.flags |= placement;
	}
	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}
function mountSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);

	primaryChildFragment.return = wip;
	wip.child = primaryChildFragment;

	return primaryChildFragment;
}
function mountSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

	fallbackChildFragment.flags |= placement;

	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function reconcilerChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;

	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}
