var currentEditor;
var editors = {};
var isResizing = false;
var lastKnownMouseX = 0;
var animationFrameRequested = false;


function initMonaco() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs' }});
    require(['vs/editor/editor.main'], function () {
        editors.html = monaco.editor.create(document.getElementById('htmlEditor'), {
            value: localStorage.getItem('htmlCode') || '<!-- HTML goes here -->',
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
        });
        editors.css = monaco.editor.create(document.getElementById('cssEditor'), {
            value: localStorage.getItem('cssCode') || '/* CSS goes here */',
            language: 'css',
            theme: 'vs-dark',
            automaticLayout: true,
        });
        editors.js = monaco.editor.create(document.getElementById('jsEditor'), {
            value: localStorage.getItem('jsCode') || '// JavaScript goes here',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
        });

        // Show HTML editor by default
        currentEditor = 'html';
        document.getElementById('htmlEditor').style.display = 'block';
    });
}


function showEditor(lang) {
    Object.keys(editors).forEach(function(key) {
        document.getElementById(key + 'Editor').style.display = 'none';
    });
    currentEditor = editors[lang];
    document.getElementById(lang + 'Editor').style.display = 'block';
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === lang) {
            tab.classList.add('active');
        }
    });
}

function runCode() {
    var htmlCode = editors.html.getValue();
    var cssCode = "<style>" + editors.css.getValue() + "</style>";
    var jsCode = "<script>" + editors.js.getValue() + "<\/script>";
    var iframe = document.getElementById('output').contentWindow.document;
    iframe.open();
    iframe.write(htmlCode + cssCode + jsCode);
    iframe.close();
}


function saveCode() {

    localStorage.setItem('htmlCode', editors.html.getValue());
    localStorage.setItem('cssCode', editors.css.getValue());
    localStorage.setItem('jsCode', editors.js.getValue());

    document.getElementById('html_code').value = editors.html.getValue();
    document.getElementById('css_code').value = editors.css.getValue();
    document.getElementById('js_code').value = editors.js.getValue();
    document.getElementById('saveForm').submit();
}

function shareOutput() {
    var htmlCode = editors.html.getValue();
    var cssCode = editors.css.getValue();
    var jsCode = editors.js.getValue();

    // Packaging the code for sharing
    var combinedCode = {
        html_code: htmlCode,
        css_code: cssCode,
        js_code: jsCode
    };

    // Sending the packaged code to the server
    fetch('/save_snippet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(combinedCode)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Check if the server response includes the unique_id
        if (!data.unique_id) {
            throw new Error('Response JSON does not include unique_id');
        }
        const outputShareUrl = `${window.location.origin}/share/output/${data.unique_id}`;
        document.getElementById('shareLink').innerHTML = `Output Link: <a href="${outputShareUrl}" target="_blank">${outputShareUrl}</a>`;
        alert('Share link generated successfully!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to generate share link.');
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

let currentFontSize = 14; // Default font size for Monaco editor

function changeZoom(direction) {
    // Increment or decrement font size
    currentFontSize += direction;
    // Set minimum and maximum font size limits
    currentFontSize = Math.max(10, Math.min(30, currentFontSize));

    // Apply the font size change to all editors
    editors.html.updateOptions({ 'fontSize': currentFontSize });
    editors.css.updateOptions({ 'fontSize': currentFontSize });
    editors.js.updateOptions({ 'fontSize': currentFontSize });
}


function shareCode() {
    var htmlCode = editors.html.getValue();
    var cssCode = editors.css.getValue();
    var jsCode = editors.js.getValue();

    // Sending the code to the server to save and generate a shareable link
    fetch('/save_snippet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Add CSRF token header if you're using CSRF protection
        },
        body: JSON.stringify({html_code: htmlCode, css_code: cssCode, js_code: jsCode})
    })
    .then(response => response.json())
    .then(data => {
        // Update to use the returned unique_id to generate the shareable link
        const shareUrl = window.location.href + 'share/' + data.unique_id; // Adjust if needed
        document.getElementById('shareLink').innerHTML = `
        <span>Shareable Code Link:</span>
        <a href="${shareUrl}" target="_blank" class="shareable-link">${shareUrl}</a>
        <button onclick="copyToClipboard('${shareUrl}')" class="copy-button"><i class="fas fa-clipboard"></i></button>
    `;
    alert('Share link generated successfully!');
    })
    .catch(error => console.error('Error:', error));
}
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    });
}

// Initialize resize event
function initResize() {
    isResizing = true;
}

// Resize function using requestAnimationFrame
function resize() {
    if (!isResizing) return;

    // Avoid unnecessary layout recalculations by only updating when needed
    if (!animationFrameRequested) {
        animationFrameRequested = true;
        requestAnimationFrame(function () {
            var container = document.getElementById('editorOutputContainer');
            var containerRect = container.getBoundingClientRect();
            var newWidth = lastKnownMouseX - containerRect.left;

            if (newWidth < 100) newWidth = 100;
            if (newWidth > containerRect.width - 100) newWidth = containerRect.width - 100;

            var editorContainer = document.querySelector('.editor:not([style*="display: none"])');
            var outputContainer = document.getElementById('output');

            editorContainer.style.width = newWidth + 'px';
            outputContainer.style.width = (containerRect.width - newWidth) + 'px';

            Object.keys(editors).forEach(function (key) {
                editors[key].layout();
            });

            animationFrameRequested = false;
        });
    }
}

// Event listener for mouse move
window.addEventListener('mousemove', function (e) {
    lastKnownMouseX = e.clientX;
    if (isResizing) {
        resize();
    }
}, false);

// Attach the event listeners for resizing
document.addEventListener('DOMContentLoaded', function() {
    initMonaco();

    var resizeBar = document.querySelector('.resize');
    resizeBar.addEventListener('mousedown', function(e) {
        isResizing = true;
        e.preventDefault(); // Prevent text selection during drag
    }, false);

    window.addEventListener('mouseup', function() {
        isResizing = false;
    }, false);
});

