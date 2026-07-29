// text-readability ships no types. Only the functions we use.
declare module 'text-readability' {
	const rs: {
		fleschKincaidGrade(text: string): number;
		textStandard(text: string, floatOutput: true): number;
		difficultWords(text: string): number;
		lexiconCount(text: string): number;
		sentenceCount(text: string): number;
	};
	export default rs;
}
