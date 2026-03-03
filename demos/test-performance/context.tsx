import { useState, useContext, createContext, memo } from 'react';
import { createRoot } from 'react-dom/index';

const ctx = createContext(0);

export default function App() {
	const [num, update] = useState(0);
	console.log('App render ', num);
	return (
		<ctx.Provider value={num}>
			<div
				onClick={() => {
					update(1);
				}}
			>
				<Cpn />
			</div>
		</ctx.Provider>
	);
}

const Cpn = memo(function () {
	console.log('Cpn render');
	return (
		<div>
			<Child />
		</div>
	);
});

function Child() {
	console.log('Child render');
	const val = useContext(ctx);

	return <div>ctx: {val}</div>;
}
createRoot(document.getElementById('root')!).render(<App />);
