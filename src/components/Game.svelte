<script>
    import Snake from "./Snake.svelte";

    // Props of the game
   export let width = 600;
   export let height = 400;


    // Variables of the game
    let score = 0;    



    /**
     * The snake object
     * .body is an array of objects containing every bodypart of the snake, the first element is the head
     * .direction is a string the snake is currently facing (right, left, up, down)
     * .size is the size of the square representing a bodypart
    */
    let snake = {

    };

    /**
     * The food object
     * .x and .y are numbers representing the coordinates of the food
     * .size is the size of the square representing the food
    */
    let food = {
        
    }

    // Game loop to handle the interval of the game -----------------------------------------

    function gameLoop() {
        

        
    }

    // Main functions for the gameloop -------------------------------------------------------

    /**
     * Moves each snake bodyparts based on the snake direction
     */
    function move() {
        

        
    }

    /**
     * Tests if the snake eats food, if so:
     * - increases the score
     * - decreases the timer and restart the gameLoop
     * - creates another food
     * - makes the snake grows
     */
    function eatingTest() {
        


    }

    /**
     * Tests if the snake collide with the border or with himself, if so:
     * - sets isLost to true
     * - clears the loop interval
     */
    function losingTest() {
        


    }


    // Utility functions -------------------------------------------------------

    /**
     * Tests if 2 rectangles collide
     * @param {Object} rect1 An object with x and y keys
     * @param {Object} rect2 An object with x and y keys
     * @return {Boolean} true if rect1 and rect2 collide
    */
    function collide(rect1, rect2) {
       


    }

    /**
     * Generates a food with random x and y positions
     * Recursively calls itself until it creates a food that doesn't collide with the snake
     * @return the food or the function itself
     */
    function getFood() {
       


    }

    /**
     * Generates a random multiple of squareSize between 0 and the parameter
     * @param {Number} max The maximum range value
     * @return {Number} the random number
     */
    function randomPos(max) {
		


    }
    
    // Event listener -------------------------------------------------------

    function handleKeydown(event) {
        


    }

    // Automaticaly calls the game loop when the component is loaded ----------

    (() => {
        
    })();

</script>

<style>
    section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
	.gameArea {
        position: relative;
        border: 1px solid black;
    }
    input:focus {
        outline: none;
    }
    .colorField {
        display: flex;

    }
    .colorField label {
        margin: 0 1rem 1rem 1rem;
    }
</style>

<!-- Section game area -->
<section class="gameArea" style="width: {width}px; height: {height}px;">
    <!-- If block to test if the game is not lost -->

        <!-- Snake component -->
        <Snake />
        <!-- /Snake -->
        <!-- Food component -->
      
        <!-- /Food -->
    <!-- Else game is lost) -->

       
        
     
           
    
           
       
    
    

    <!-- /If -->
</section>
<!-- /Section -->
<!-- Section bonus -->
<section>
    <!-- Score display -->
   <p>Score : {score}</p>
    <!-- /Score -->
    <!-- Snake's color picker -->
 
    
 
       
      
      
      
      
   
  





    <!-- /Snake's color picker -->
</section>
<!-- /Section-->

<!-- Keydown event listener -->

<!-- /Keydown -->