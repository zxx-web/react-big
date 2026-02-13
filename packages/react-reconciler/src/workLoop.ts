import { Props } from 'shared/ReactTypes';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import { HostRoot } from './workTag';
import { mutationMask, noFLags, passiveMask } from './fiberFlags';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import {
	getHighestPriorityLane,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as normalPriority
} from 'scheduler';
import { hookHasEffect, passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdate(root, lane);
	ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane === NoLane) {
		return;
	}
	if (updateLane === SyncLane) {
		if (__DEV__) {
			console.warn('在微任务中调度，优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallback);
	} else {
		if (__DEV__) {
			console.warn('在宏任务中调度，优先级：', updateLane);
		}
	}
}
function markRootUpdate(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

// 从当前fiber节点找到fiberRootNode节点
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = fiber.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}
	prepareFreshStack(root, lane);
	do {
		try {
			workLoop();
			break;
		} catch (error) {
			if (__DEV__) {
				console.warn('workLoop发生错误', error);
			}
			workInProgress = null;
		}
	} while (true);

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishLane = lane;
	wipRootRenderLane = NoLane;
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}
	if (__DEV__) {
		console.warn('commit阶段开始', finishedWork);
	}
	const lane = root.finishLane;
	if (lane === NoLane && __DEV__) {
		console.error('commit阶段不应该是NoLane');
	}
	root.finishedWork = null;
	root.finishLane = NoLane;
	markRootFinished(root, lane);
	if (
		(finishedWork.flags & passiveMask) !== noFLags ||
		(finishedWork.subtreeFlags & passiveMask) !== noFLags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度
			scheduleCallback(normalPriority, () => {
				// 执行
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}
	// 判断是否存在3个阶段需要执行的操作
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & (mutationMask | passiveMask)) !== noFLags;
	const rootHasEffects =
		(finishedWork.flags & (mutationMask | passiveMask)) !== noFLags;
	if (subtreeHasEffects || rootHasEffects) {
		// before mutation
		// mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork;
		// layout
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}
function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(passive, effect);
	});
	pendingPassiveEffects.unmount = [];
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(passive | hookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(passive | hookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	flushSyncCallback();
}
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}

export function createWorkInProgress(
	current: FiberNode,
	pendingProps: Props
): FiberNode {
	let wip = current.alternate;
	if (wip === null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update
		wip.pendingProps = pendingProps;
		wip.flags = noFLags;
		wip.subtreeFlags = noFLags;
		wip.deletions = null;
	}
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;
	return wip;
}
