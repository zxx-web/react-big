import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	Update,
	UpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';
import { FLags, passiveEffect } from './fiberFlags';
import { hookHasEffect, passive } from './hookEffectTags';

let currentlyRenderFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;
const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}
export interface Effect {
	tag: FLags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}
export interface FCUpdateQueue<T> extends UpdateQueue<T> {
	lastEffect: Effect | null;
}
type EffectCallback = () => void;
type EffectDeps = any[] | null;
export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentlyRenderFiber = wip;
	renderLane = lane;
	// 重置 hooks 链表
	wip.memoizedState = null;
	// 重置 effects 链表
	wip.updateQueue = null;
	const current = wip.alternate;

	if (current !== null) {
		currentDispatcher.current = HooksDisptcherOnUpdate;
	} else {
		currentDispatcher.current = HooksDisptcherOnMount;
	}
	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);
	currentlyRenderFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;
	return children;
}

const HooksDisptcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
};

const HooksDisptcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
};

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentlyRenderFiber as FiberNode).flags |= passiveEffect;
	hook.memoizedState = pushEffect(
		passive | hookHasEffect,
		create,
		undefined,
		nextDeps
	);
}
function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: EffectCallback | void;
	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				pushEffect(passive, create, destroy, nextDeps);
				return;
			}
		}
		(currentlyRenderFiber as FiberNode).flags |= passiveEffect;
		hook.memoizedState = pushEffect(
			passive | hookHasEffect,
			create,
			destroy,
			nextDeps
		);
	}
}
function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (nextDeps === null || prevDeps === null) {
		return false;
	}
	for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}
function pushEffect(
	hookFlags: FLags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function createFCUpdateQueue<T>() {
	const updateQueue = createUpdateQueue<T>() as FCUpdateQueue<T>;
	updateQueue.lastEffect = null;
	return updateQueue;
}
function mountState<T>(initialState: () => T | T): [T, Dispatch<T>] {
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memoizedState = memoizedState;
	const queue = createUpdateQueue();
	hook.updateQueue = queue;
	const dispatch = dispatchSetState.bind(null, currentlyRenderFiber!, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}

function updateState<T>(): [T, Dispatch<T>] {
	const hook = updateWorkInProgressHook();

	const queue = hook.updateQueue as UpdateQueue<T>;
	const baseState = hook.baseState;

	const pending = queue.shared.pending;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	if (pending !== null) {
		if (baseQueue !== null) {
			// 将baseQueue pendingQueue 连接起来
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;

			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		current.baseQueue = baseQueue;
		queue.shared.pending = null;

		if (baseQueue !== null) {
			const {
				memoizedState,
				baseQueue: newBaseQueue,
				baseState: newBaseState
			} = processUpdateQueue(baseState, baseQueue, renderLane);
			hook.memoizedState = memoizedState;
			hook.baseState = newBaseState;
			hook.baseQueue = newBaseQueue;
		}
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<T>];
}

function updateWorkInProgressHook(): Hook {
	let nextCurrentHook: Hook | null = null;
	if (currentHook === null) {
		const currentFiber = currentlyRenderFiber?.alternate;
		if (currentFiber !== null) {
			nextCurrentHook = currentFiber?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}
	if (nextCurrentHook === null) {
		throw new Error(`组件${currentlyRenderFiber?.type}本次执行hooks比上次多`);
	}
	currentHook = nextCurrentHook;
	const newHook: Hook = {
		memoizedState: currentHook?.memoizedState,
		updateQueue: currentHook?.updateQueue,
		next: null,
		baseQueue: currentHook.baseQueue,
		baseState: currentHook.baseState
	};
	if (workInProgressHook === null) {
		if (currentlyRenderFiber === null) {
			throw new Error('请在函数组件中使用hook');
		} else {
			workInProgressHook = newHook;
			currentlyRenderFiber.memoizedState = workInProgressHook;
		}
	} else {
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}
function dispatchSetState<T>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<T>,
	action: Action<T>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}
function mountWorkInProgressHook() {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
		baseState: null,
		baseQueue: null
	};
	if (workInProgressHook === null) {
		if (currentlyRenderFiber === null) {
			throw new Error('请在函数组件中使用hook');
		} else {
			workInProgressHook = hook;
			currentlyRenderFiber.memoizedState = workInProgressHook;
		}
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}
