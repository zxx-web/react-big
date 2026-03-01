import { useState } from 'react';
import { createRoot } from 'react-dom/index';

export default function App() {
	const [num, update] = useState(0);
	console.log('App render ', num);
	return (
		<div
			onClick={() => {
				update(1);
			}}
		>
			<Cpn />
		</div>
	);
}

function Cpn() {
	console.log('cpn render');
	return <div>cpn</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
