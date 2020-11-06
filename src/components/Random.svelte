<script context = "module">
    /**
     * Generates a random multiple of square between 0 and max
     * @param {Number} max The maximum range value
     * @param {Number} square The multiple wanted
     * @return {Number} the random number
     */
    export function randomPos(max, square) {
        let pos = (Math.floor(Math.random() * ((max/square) -1)) * square);
        return pos;
    }
</script>