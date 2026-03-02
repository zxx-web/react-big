import { useState, memo, useCallback } from 'react';
import { createRoot } from 'react-dom/index';

export default function App() {
	const [num, update] = useState(0);
	console.log('App render ', num);

	const addOne = useCallback(() => update((num) => num + 1), []);

	return (
		<div>
			<Cpn onClick={addOne} />
			{num}
		</div>
	);
}

const Cpn = memo(function ({ onClick }) {
	console.log('Cpn render');
	return (
		<div onClick={() => onClick()}>
			<Child />
		</div>
	);
});

function Child() {
	console.log('Child render');
	return <p>i am child</p>;
}

createRoot(document.getElementById('root')!).render(<App />);
