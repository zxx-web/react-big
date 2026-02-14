import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/index';

function App() {
	const [num, updateNum] = useState(100);

	return (
		<ul onClick={() => updateNum(50)}>
			{new Array(num).fill(0).map((_, i) => (
				<Child key={i}>{i}</Child>
			))}
		</ul>
	);
}

function Child({ children }) {
	const now = performance.now();
	while (performance.now() - now < 4) {}

	return <li>{children}</li>;
}

createRoot(document.getElementById('root')!).render(<App />);
