import type { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import { FunctionComponent, HostComponent, type WorkTag } from './workTag';
import type { FLags } from './fiberFlags';
import type { Container } from 'hostConfig';
import { noFLags } from './fiberFlags';

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
		this.key = key;
		this.type = null;
		this.stateNode = null;
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		this.ref = null;
		this.alternate = null;
		this.flags = noFLags;
		this.subtreeFlags = noFLags;
		this.updateQueue = null;
		this.memoizedState = null;
		this.deletions = null;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}
