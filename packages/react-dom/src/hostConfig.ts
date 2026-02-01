export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: any): Instance {
	const element = document.createElement(type);
	// 处理props
	console.log(props);
	return element;
}

export function appendInitialChild(
	parent: Instance | Container,
	child: Instance
) {
	parent.appendChild(child);
}

export function createTextInstance(text: string): TextInstance {
	return document.createTextNode(text);
}

export const appendChildToContainer = appendInitialChild;
