import type { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	type WorkTag
} from './workTag';
import type { FLags } from './fiberFlags';
import type { Container } from 'hostConfig';
import { noFLags } from './fiberFlags';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes';
import { Effect } from './fiberHooks';
import { CallbackNode } from 'scheduler';
import { REACT_PROVIDER_TYPE } from 'shared/ReactSymbols';

export class FiberNode {
	type: any;
	tag: WorkTag;
	pendingProps: Props;
	key: Key;
	stateNode: any;
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	ref: Ref;
	memoizedProps: Props | null;
	alternate: FiberNode | null;
	flags: FLags;
	subtreeFlags: FLags;
	updateQueue: unknown;
	memoizedState: any;
	deletions: FiberNode[] | null;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.key = key ?? null;
		this.type = null;
		this.stateNode = null;
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		this.ref = { current: null };
		this.alternate = null;
		this.flags = noFLags;
		this.subtreeFlags = noFLags;
		this.updateQueue = null;
		this.memoizedState = null;
		this.deletions = null;
	}
}
export interface PendingPassiveEffects {
	unmount: Effect[];
	update: Effect[];
}
export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes;
	finishLane: Lane;
	pendingPassiveEffects: PendingPassiveEffects;
	callbackNode: CallbackNode | null;
	callbackPriority: Lane;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishLane = NoLane;
		this.pendingPassiveEffects = {
			unmount: [],
			update: []
		};
		this.callbackNode = null;
		this.callbackPriority = NoLane;
	}
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props, ref } = element;
	let fiberTag: WorkTag = FunctionComponent;
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (
		typeof type === 'object' &&
		type.$$typeof === REACT_PROVIDER_TYPE
	) {
		fiberTag = ContextProvider;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	fiber.ref = ref;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
