import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(...lanes: (Lane | Lanes)[]): Lane {
	const res = lanes.reduce((pre, cur) => pre | cur, NoLane);
	return res;
}
// 返回当前更新的lane
export function requestUpdateLane() {
	return SyncLane;
}
// 返回lanes中最高优先级的lane
export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}
// 从root中移除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
