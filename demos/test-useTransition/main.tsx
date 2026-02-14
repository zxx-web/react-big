import { useState, useTransition } from 'react';
import { createRoot } from 'react-dom/index';

function TabContainer() {
	const [tab, setTab] = useState('about');
	return (
		<>
			<TabButton isActive={tab === 'about'} action={() => setTab('about')}>
				About
			</TabButton>
			<TabButton isActive={tab === 'posts'} action={() => setTab('posts')}>
				Posts (slow)
			</TabButton>
			<TabButton isActive={tab === 'contact'} action={() => setTab('contact')}>
				Contact
			</TabButton>
			<hr />
			{tab === 'about' && <AboutTab />}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
		</>
	);
}

function TabButton({ action, children, isActive }) {
	const [isPending, startTransition] = useTransition();
	if (isActive) {
		return <b>{children}</b>;
	}
	if (isPending) {
		return <b className="pending">{children}</b>;
	}
	return (
		<button
			onClick={() => {
				startTransition(async () => {
					await action();
				});
			}}
		>
			{children}
		</button>
	);
}
function AboutTab() {
	return <p>Welcome to my profile!</p>;
}
function PostsTab() {
	// 打印一次。真正变慢的地方在 SlowPost 内。
	console.log('[ARTIFICIALLY SLOW] Rendering 500 <SlowPost />');

	let items = [];
	for (let i = 0; i < 500; i++) {
		items.push(<SlowPost key={i} index={i} />);
	}
	return <ul className="items">{items}</ul>;
}

function SlowPost({ index }) {
	let startTime = performance.now();
	while (performance.now() - startTime < 1) {
		// 每个 item 都等待 1 毫秒以模拟极慢的代码。
	}

	return <li className="item">Post #{index + 1}</li>;
}
function ContactTab() {
	return (
		<>
			<p>You can find me online here:</p>
			<ul>
				<li>admin@mysite.com</li>
				<li>+123456789</li>
			</ul>
		</>
	);
}

createRoot(document.getElementById('root')!).render(<TabContainer />);
