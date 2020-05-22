const openAbout = () => {
  const div = document.createElement('div');
  div.className = 'about';
  div.innerHTML = `
  <h1>UncolorBlind</h1>
  <p>Enjoy this set of virtual<br /><b>un-color blindness goggles</b>.</p>
  
  <p><b>Drag and drop</b> an image to view it,<br />or use <b>your camera</b> to filter video live.</p>
  
  <p>Created by <a href="https://acko.net/" target="_blank">Steven Wittens</a><br /><small><a href="https://github.com/unconed/uncolorblind" target="_blank">Source code</a></small></p>
  
  <p class="button"><button>Close</button></p>

  <p><small><em>Your privacy is respected.<br />No data is uploaded to the cloud.</em></small></p>
  `;

  document.body.appendChild(div);
  
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