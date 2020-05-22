// Open static dialog
const openAbout = () => {

  // Make div wrapper
  const div = document.createElement('div');
  div.className = 'about';

  // Static HTML template
  div.innerHTML = `
  
  <div class="flex-if-wide align-center">
    <h1 class="rigid"><img src="./assets/logo-512.png" width="192" height="192"> UncolorBlind</h1>

    <div class="grow">
      <div class="grow">
        <p class="description">Enjoy these virtual <b class="no-wrap">un-color blindness goggles</b>.<br />Browse the <b>examples</b> in the corner to get started.</p>
        <p><b>Drag and drop</b> an image to view it, or use <b class="no-wrap">your camera</b> to filter video live.<span class="no-mobile"><br />Click to <b>shift the highlighted color tint</b>.<br /><b>CSS color codes</b> are copied to the clipboard.</span></p>
      </div>

      <p class="close button grow"><button>Got it!</button></p>

      <div class="flex flex-if-not-narrow justify-center wrap features">
        <div class="footer flex flex-if-not-narrow">
  
          <p class="colofon left"><small>By <a href="https://acko.net/" target="_blank">Steven Wittens</a><br /><a href="https://github.com/unconed/uncolorblind" target="_blank">Source code</a></small></p>

          <div class="privacy flex">
            <p class="right grow"><img class="no-cloud" src="./assets/no-cloud.svg" width="32" height="38" alt="No Cloud"></p>
            <p class="grow"><small><em>Nothing is uploaded to the cloud.<br />Your privacy is fully respected.</em></small></p>
          </div>
  
        </div>

      </div>
    </div>
  </div>

  <img src="./assets/arrow.svg" class="arrow no-mobile" alt="">

  `;

  document.body.appendChild(div);

  // Handle close events on canvas and button
  const canvas = document.querySelector('canvas');
  const button = document.querySelector('.about button');
  
  const remove = () => div.parentNode.removeChild(div);
  const close = () => {
    button.removeEventListener('click', close);
    canvas.removeEventListener('click', close);
    remove();
  }

  button.addEventListener('click', close);
  canvas.addEventListener('click', close)
}

module.exports = {openAbout}