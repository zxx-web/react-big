import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority
} from 'scheduler';
import { FiberRootNode } from './fiber';
import internals from 'shared/internals';

const { CurrentBatchConfig } = internals;

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b00001;
export const InputContinuousLane = 0b00010;
export const DefaultLane = 0b00100;
export const TransitionLane = 0b01000;
export const IdleLane = 0b10000;
export const NoLane = 0b00000;
export const NoLanes = 0b00000;

export function mergeLanes(...lanes: (Lane | Lanes)[]): Lane {
	const res = lanes.reduce((pre, cur) => pre | cur, NoLane);
	return res;
}
// 返回当前更新的lane
export function requestUpdateLane() {
	const isTransition = CurrentBatchConfig.transition !== null;
	if (isTransition) {
		return TransitionLane;
	}
	const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(currentSchedulerPriority);
	return lane;
}
// 返回lanes中最高优先级的lane
export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}
export function isSubsetOfLanes(set: Lanes, subset: Lane) {
	return (set & subset) === subset;
}
// 从root中移除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}

export function lanesToSchedulerPriority(lanes: Lanes) {
	const lane = getHighestPriorityLane(lanes);
	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number) {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}
