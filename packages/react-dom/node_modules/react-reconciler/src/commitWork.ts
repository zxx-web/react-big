import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertChildToContainer,
	Instance,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import {
	mutationMask,
	noFLags,
	placement,
	update,
	childDeletion,
	passiveEffect,
	FLags,
	passiveMask
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTag';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { hookHasEffect } from './hookEffectTags';

let nextEffect: FiberNode | null = null;
export function commitMutationEffects(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & (mutationMask | passiveMask)) !== noFLags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect, root);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
}

const commitMutationEffectsOnFiber = (
	fiber: FiberNode,
	root: FiberRootNode
) => {
	const { flags } = fiber;
	if ((flags & placement) !== noFLags) {
		commitPlacement(fiber);
		fiber.flags &= ~placement;
	}
	if ((flags & update) !== noFLags) {
		commitUpdate(fiber);
		fiber.flags &= ~update;
	}
	if ((flags & childDeletion) !== noFLags) {
		const deletions = fiber.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDelete) => {
				commitDeletion(childToDelete, root);
			});
		}
		fiber.flags &= ~childDeletion;
	}
	if ((flags & passiveEffect) !== noFLags) {
		commitPassiveEffect(fiber, root, 'update');
		fiber.flags &= ~passiveEffect;
	}
};

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (
		fiber.tag !== FunctionComponent ||
		(type === 'update' && (fiber.flags & passiveEffect) === noFLags)
	) {
		return;
	}
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && __DEV__) {
			console.warn('不应该不存在effect');
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect!);
	}
}
function commitHookEffectList(
	flags: FLags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect;
	do {
		if ((effect.tag & flags) === flags) {
			callback(effect);
		}
		effect = effect.next as Effect;
	} while (effect !== lastEffect.next);
}
export function commitHookEffectListUnmount(flags: FLags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
		effect.tag &= ~hookHasEffect;
	});
}
export function commitHookEffectListDestroy(flags: FLags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
	});
}
export function commitHookEffectListCreate(flags: FLags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destroy = create();
		}
	});
}
const commitPlacement = (fiber: FiberNode) => {
	if (__DEV__) {
		console.warn('commitPlacement', fiber);
	}
	const parent = getHostParent(fiber);
	const sibling = getHostSibling(fiber);
	insertOrAppendPlacementNodeToContainer(fiber, parent, sibling);
};

function recordHostChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	const lastOne = childrenToDelete[childrenToDelete.length - 1];
	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

const commitDeletion = (childToDelete: FiberNode, root: FiberRootNode) => {
	const rootHostChildren: FiberNode[] = [];
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
			case HostText:
				recordHostChildrenToDelete(rootHostChildren, unmountFiber);
				return;
			case FunctionComponent:
				commitPassiveEffect(unmountFiber, root, 'unmount');
				return;
			default:
				if (__DEV__) {
					console.warn('未处理的unmount类型', unmountFiber);
				}
				break;
		}
	});
	if (rootHostChildren.length !== 0) {
		const hostParent = getHostParent(childToDelete);
		rootHostChildren.forEach((node) => {
			removeChild(node.stateNode, hostParent);
		});
	}
	childToDelete.return = null;
	childToDelete.child = null;
};

function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root;

	while (true) {
		onCommitUnmount(node);

		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === root) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}

			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

// 找到当前fiber节点的宿主环境右节点
function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostRoot ||
				parent.tag === HostComponent
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostComponent && node.tag !== HostText) {
			if ((node.flags & placement) !== noFLags) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		if ((node.flags & placement) === noFLags) {
			return node.stateNode;
		}
	}
}

// 找到当前fiber节点的宿主环境父节点
function getHostParent(fiber: FiberNode): Container {
	let parent = fiber.return;
	let result: Container | null = null;
	while (parent !== null) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			result = parent.stateNode;
			break;
		}
		if (parentTag === HostRoot) {
			result = (parent.stateNode as FiberRootNode).container;
			break;
		}
		parent = parent.return;
	}
	if (__DEV__ && result === null) {
		console.warn('getHostParent not found', fiber);
	}
	return result!;
}

function insertOrAppendPlacementNodeToContainer(
	fiber: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	if (fiber.tag === HostComponent || fiber.tag === HostText) {
		if (before) {
			insertChildToContainer(fiber.stateNode, hostParent, before);
		} else {
			appendChildToContainer(hostParent, fiber.stateNode);
		}
		return;
	}
	const child = fiber.child;
	if (child !== null) {
		insertOrAppendPlacementNodeToContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			insertOrAppendPlacementNodeToContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
