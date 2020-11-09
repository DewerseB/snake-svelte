<script>
    // Food props
export let x = 80; 
export let y = 80;
export let size = 40;



    // Food image
    let imgSrc = "./img/mouse.png";
</script>

<style>
    .food {
        position: absolute;
    }
    .imgFood {
        height: 100%;
        width: 100%;
    }
</style>
<div class = "food" style = "width: {size}px; heigth: {size}px; left: {x}px; top: {y}px;">
<!-- Div containing the food -->

    <!-- Food image -->
<img class = "imgFood" src = {imgSrc} alt = "mouse">
    <!-- /Food -->

<!-- /Div -->
</div>
