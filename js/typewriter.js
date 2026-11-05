document.addEventListener("DOMContentLoaded", () => {
  const text = "ᠥᠪ ᠪᠢᠴᠢᠭ᠌";
  const element = document.getElementById("typewriter-script");

  let index = 0;
  const speed = 80;

  function typeWriter() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      setTimeout(typeWriter, speed);
    }
  }

  setTimeout(typeWriter, 500);
});
