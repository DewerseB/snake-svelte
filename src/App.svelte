<script>
	import Food from "./components/Food.svelte";
	import Game from "./components/Game.svelte";

	/**
	 * Game object
	 * .width : width of the game area
	 * .height : height of the game area
	 * .squareSize : length of an in-game square
	 */
	let game = {
		width: 600,
		height: 400,


	};

	/**
	 * Assigns the same values to the game object to trigger a change in game #key
	*/
	function gameInit() {
		
	};
</script>

<main>
	<h1>Snake</h1>
	<!-- Key: remounts everything in #key block whenever game variable changes -->

		<!-- Game component with game object as a prop -->
		<Game {...game}/>
		<!-- /Game -->
	
	<!-- /Key -->
	<!-- Button to restart the game -->

	<!-- /Button -->
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>