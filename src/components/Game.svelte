<script>
    import Snake from "./Snake.svelte";
    import Food from "./Food.svelte";
    import {randomPos} from "./Random.svelte";
    import { fade, fly} from 'svelte/transition';

    // Props of the game
    export let width = 600;
    export let height = 400;
    export let squareSize = 40;

    // Variables of the game
    let score = 0;    
    let loop;
    let timer = 500;
    let choosedDirection = false;
    let isLost = false;


    /**
     * The snake object
     * .body is an array of objects containing every bodypart of the snake, the first element is the head
     * .direction is a string the snake is currently facing (right, left, up, down)
     * .size is the size of the square representing a bodypart
    */
    let snake = {
        body : [{
            x : 0,
            y : 0,
            oldX: 0,
            oldY: 0,
        },{
            x : 0,
            y : 0,
            oldX: 0,
            oldY: 0,
        },{
            x : 0,
            y : 0,
            oldX: 0,
            oldY: 0,
        }],
        direction : "right",
        size : squareSize,
        colorSnake : "green",
    };

    /**
     * The food object
     * .x and .y are numbers representing the coordinates of the food
     * .size is the size of the square representing the food
    */
    let food = {
        x : randomPos(width, squareSize),
        y : randomPos(height,squareSize),
        size : squareSize,
        
    }

    // Game loop to handle the interval of the game -----------------------------------------

    function gameLoop() {
        loop = setInterval(()=>{
            move();
            losingTest();
        }, timer)

        
    }

    // Main functions for the gameloop -------------------------------------------------------

    /**
     * Moves each snake bodyparts based on the snake direction
     */
    function move() {
        for (let i = 0; i<snake.body.length; i ++){
            snake.body[i].oldX = snake.body[i].x;
            snake.body[i].oldY = snake.body[i].y;
            if (i === 0){
                if (snake.direction === "right"){
                    snake.body[i].x += squareSize;
                }
                if (snake.direction === "left"){
                    snake.body[i].x -= squareSize;
                }
                if (snake.direction === "down"){
                    snake.body[i].y += squareSize;
                }
                if (snake.direction === "up"){
                    snake.body[i].y -= squareSize;
                }
            }
            else {
                snake.body[i].x = snake.body[i-1].oldX;
                snake.body[i].y = snake.body[i-1].oldY;
            }
        };
        choosedDirection = false;

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
        if (snake.body[0].x >= width || snake.body[0].x <0 || snake.body[0].y >= height || snake.body[0].y <0) {
            isLost = true;
            clearInterval(loop);
        } else {
            snake.body.forEach((bodypart, i) => {
                if ((i !== 0) && collide(snake.body[0], bodypart)) {
                    isLost = true;
                    clearInterval(loop);
                }
            })
        }


    }


    // Utility functions -------------------------------------------------------

    /**
     * Tests if 2 rectangles collide
     * @param {Object} rect1 An object with x and y keys
     * @param {Object} rect2 An object with x and y keys
     * @return {Boolean} true if rect1 and rect2 collide
    */
    function collide(rect1, rect2) {
        if (rect1.x < rect2.x + squareSize &&
            rect1.x + squareSize > rect2.x &&
            rect1.y < rect2.y + squareSize &&
            rect1.y + squareSize > rect2.y) {
                return true;
            }
            return false;
    }

    /**
     * Generates a food with random x and y positions
     * Recursively calls itself until it creates a food that doesn't collide with the snake
     * @return the food or the function itself
     */
    function getFood() {
       


    }
    
    
    // Event listener -------------------------------------------------------

    function handleKeydown(event) {
        let keyCode = event.keyCode;
            if (!choosedDirection && !isLost) {
                if (keyCode === 39 && snake.direction !== "left"){
                snake.direction = "right";
                choosedDirection = true;
            }
            if (keyCode === 37 && snake.direction !== "right"){
                snake.direction = "left";
                choosedDirection = true;
            }
            if (keyCode === 40 && snake.direction !== "up"){
                snake.direction = "down";
                choosedDirection = true;
            }
            if (keyCode === 38 && snake.direction !== "down"){
                snake.direction = "up";
                choosedDirection = true;
            }
        }

    }

    // Automaticaly calls the game loop when the component is loaded ----------

    (() => {
        gameLoop();
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
    /* input:focus {
        outline: none;
    }
    .colorField {
        display: flex;

    }
    .colorField label {
        margin: 0 1rem 1rem 1rem;
    } */
</style>

<!-- Section game area -->
<section class="gameArea" style="width: {width}px; height: {height}px;">
    <!-- If block to test if the game is not lost -->
    {#if !isLost}
        <!-- Snake component -->
        <Snake {...snake}/>
        <!-- /Snake -->
        <!-- Food component -->
        <Food {...food}/>
        <!-- /Food -->
    <!-- Else game is lost) -->
    {:else}
    <h2 in:fade>Game Lost !!!</h2>
    <p in:fly="{{ x: 100, duration : 1000}}">Your score is {score}</p>
    {/if}

       
        
     
           
    
           
       
    
    

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
<svelte:window on:keydown={handleKeydown}/>
<!-- /Keydown -->