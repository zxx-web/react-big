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
	commitLayoutEffects,
	commitMutationEffects
} from './commitWork';
import {
	getHighestPriorityLane,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as normalPriority,
	unstable_shouldYield,
	unstable_cancelCallback
} from 'scheduler';
import { hookHasEffect, passive } from './hookEffectTags';
import { getSuspendedThenable, suspenseException } from './thenable';
import { resetHooksOnUnwind } from './fiberHooks';
import { throwException } from './fiberThrow';
import { unwindWork } from './fiberUnwindWork';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

type RootExistStatus = number;
const RootInComplete: RootExistStatus = 1;
const RootCompleted: RootExistStatus = 2;

type SuspendedReason = typeof notSuspended | typeof suspendedOnData;
const notSuspended = 0;
const suspendedOnData = 1;
let wipSuspendedReason: SuspendedReason = notSuspended;
let wipThrownValue: any = null;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdate(root, lane);
	ensureRootIsScheduled(root);
}

export function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	const existingCallback = root.callbackNode;
	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}
	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;
	if (curPriority === prevPriority) {
		return;
	}
	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}
	let newCallbackNode = null;
	if (updateLane === SyncLane) {
		if (__DEV__) {
			console.warn('在微任务中调度，优先级：', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMicroTask(flushSyncCallback);
	} else {
		if (__DEV__) {
			console.warn('在宏任务中调度，优先级：', updateLane);
		}
		const schedulerPriority = lanesToSchedulerPriority(updateLane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

export function markRootUpdate(root: FiberRootNode, lane: Lane) {
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
function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	const curCallback = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
	if (didFlushPassiveEffect) {
		if (root.callbackNode !== curCallback) {
			return null;
		}
	}
	const lane = getHighestPriorityLane(root.pendingLanes);
	const curCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return;
	}
	const needSync = lane === SyncLane || didTimeout;
	const existStatus = renderRoot(root, lane, !needSync);
	ensureRootIsScheduled(root);
	if (existStatus === RootInComplete) {
		if (root.callbackNode !== curCallbackNode) {
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}
	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishLane = lane;
		wipRootRenderLane = NoLane;
		commitRoot(root);
	}
}
function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}
	const existStatus = renderRoot(root, nextLane, false);
	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishLane = nextLane;
		wipRootRenderLane = NoLane;
		commitRoot(root);
	}
}
function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (lane !== wipRootRenderLane) {
		prepareFreshStack(root, lane);
	}
	do {
		try {
			if (wipSuspendedReason !== notSuspended && workInProgress !== null) {
				const thrownValue = wipThrownValue;
				wipSuspendedReason = notSuspended;
				wipThrownValue = null;
				throwAndUnwindWorkLoop(root, workInProgress, thrownValue, lane);
			}
			if (shouldTimeSlice) {
				workLoopConcurrent();
			} else {
				workLoopSync();
			}
			break;
		} catch (error) {
			if (__DEV__) {
				console.warn('workLoop发生错误', error);
			}
			handleThrow(root, error);
		}
	} while (true);
	// 中断执行
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete;
	}
	// render阶段执行完
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.warn('render阶段结束wip不应该不是null');
	}
	return RootCompleted;
}

function throwAndUnwindWorkLoop(
	root: FiberRootNode,
	unitOfWork: FiberNode,
	thrownValue: any,
	lane: Lane
) {
	// 重置 FC 相关变量
	resetHooksOnUnwind();
	// 在回调中重新调度，给suspense添加shouldCapture
	throwException(root, thrownValue, lane);
	// unwind
	unwindUnitOfWork(unitOfWork);
}

function unwindUnitOfWork(unitOfWork: FiberNode) {
	let inCompleteWork: FiberNode | null = unitOfWork;
	do {
		const next = unwindWork(inCompleteWork);
		if (next !== null) {
			workInProgress = next;
			return;
		}

		const returnFiber = inCompleteWork.return as FiberNode;
		if (returnFiber !== null) {
			returnFiber.deletions = null;
		}
		inCompleteWork = returnFiber;
	} while (inCompleteWork !== null);

	workInProgress = null;
}

function handleThrow(root: FiberRootNode, thrownValue: any) {
	if (thrownValue === suspenseException) {
		thrownValue = getSuspendedThenable();
		wipSuspendedReason = suspendedOnData;
	}
	wipThrownValue = thrownValue;
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
		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}
function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffect = false;
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(passive, effect);
	});
	pendingPassiveEffects.unmount = [];
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(passive | hookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(passive | hookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	flushSyncCallback();
	return didFlushPassiveEffect;
}
function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}
function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
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
	wip.ref = current.ref;
	return wip;
}
