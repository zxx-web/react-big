import { useState } from 'react';
import { createRoot } from 'react-dom/index';

function App() {
	const [num, setNum] = useState(1);
	const arr =
		num % 2 === 0
			? [<li key={1}>1</li>, <li key={2}>2</li>, <li key={3}>3</li>]
			: [
					<li key={3}>3</li>,
					<li key={1}>1</li>,
					<li key={4}>4</li>,
					<li key={2}>2</li>
				];
	return (
		<ul
			onClick={() => {
				setNum((num) => num + 1);
				setNum((num) => num + 1);
				setNum((num) => num + 1);
			}}
		>
			<>
				<li key={6}>6</li>
			</>
			{arr}
		</ul>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
