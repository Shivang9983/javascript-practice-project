document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('language');
    const resultContainer = document.getElementById('result');
    const startListeningButton = document.querySelector('.btn.record');
    const recordButtonText = document.querySelector('.btn.record .btn-label');
    const clearButton = document.querySelector('.btn.clear');
    const speakButton = document.querySelector('.btn.speak');
    const downloadButton = document.querySelector('.btn.download');
    const voiceHint = document.getElementById('voiceHint');
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesisApi = window.speechSynthesis;
    

    let recognition = null;
    let recognizing = false;
    let availableVoices = [];
    let transcriptBase = '';
    let transcriptFinal = '';

    languages.forEach((language) => {
        const option = document.createElement('option');
        option.value = language.code;
        option.text = language.name;
        languageSelect.add(option);
    });

    clearButton.addEventListener('click', clearResults);
    downloadButton.addEventListener('click', downloadResult);
    speakButton.addEventListener('click', speakResult);
    resultContainer.addEventListener('input', updateActionState);

    if (SpeechRecognitionApi) {
        recognition = new SpeechRecognitionApi();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = getSelectedLocale();

        languageSelect.addEventListener('change', () => {
            recognition.lang = getSelectedLocale();
            updateVoiceHint();
        });

        startListeningButton.addEventListener('click', toggleSpeechRecognition);

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = 0; i < event.results.length; i += 1) {
                const segment = event.results[i][0].transcript.trim();

                if (!segment) {
                    continue;
                }

                if (event.results[i].isFinal) {
                    finalTranscript = joinTranscript(finalTranscript, segment);
                } else {
                    interimTranscript = joinTranscript(interimTranscript, segment);
                }
            }

            transcriptFinal = finalTranscript;
            resultContainer.value = buildTranscriptValue(interimTranscript);
            resultContainer.scrollTop = resultContainer.scrollHeight;
            updateActionState();
        };

        recognition.onend = resetRecordingState;
        recognition.onerror = resetRecordingState;
    } else {
        recordButtonText.textContent = 'Voice Not Supported';
        startListeningButton.disabled = true;
        resultContainer.placeholder = 'Type here. Voice typing works best in Chrome or Edge.';
        languageSelect.addEventListener('change', updateVoiceHint);
    }

    if (speechSynthesisApi) {
        loadVoices();
        if ('onvoiceschanged' in speechSynthesisApi) {
            speechSynthesisApi.onvoiceschanged = loadVoices;
        }
    } else {
        speakButton.textContent = 'Speak Not Supported';
        speakButton.disabled = true;
        voiceHint.textContent = 'Speaking is not supported in this browser.';
    }

    updateVoiceHint();
    updateActionState();

    function toggleSpeechRecognition() {
        if (!recognition) {
            return;
        }

        if (recognizing) {
            recognition.stop();
        } else {
            transcriptBase = resultContainer.value.trim();
            transcriptFinal = '';
            recognition.lang = getSelectedLocale();
            recognition.start();
        }

        recognizing = !recognizing;
        startListeningButton.classList.toggle('recording', recognizing);
        recordButtonText.textContent = recognizing ? 'Stop Listening' : 'Start Listening';
    }

    function clearResults() {
        resultContainer.value = '';
        transcriptBase = '';
        transcriptFinal = '';

        if (speechSynthesisApi && speechSynthesisApi.speaking) {
            speechSynthesisApi.cancel();
        }

        updateActionState();
    }

    function downloadResult() {
        const resultText = resultContainer.value.trim();

        if (!resultText) {
            updateActionState();
            return;
        }

        const blob = new Blob([resultText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = 'Your-Text.txt';
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function speakResult() {
        const resultText = resultContainer.value.trim();

        if (!speechSynthesisApi || !resultText) {
            updateActionState();
            return;
        }

        if (speechSynthesisApi.speaking || speechSynthesisApi.pending) {
            speechSynthesisApi.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(resultText);
        utterance.lang = getSelectedLocale();
        utterance.rate = 1.05;
        utterance.pitch = 1;

        const matchedVoice = findMatchingVoice(utterance.lang);
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        speakButton.textContent = 'Speaking...';
        speakButton.disabled = true;

        utterance.onstart = () => {
            speakButton.textContent = 'Speaking...';
            speakButton.disabled = true;
        };

        utterance.onend = () => {
            speakButton.textContent = 'Speak';
            updateActionState();
        };

        utterance.onerror = () => {
            speakButton.textContent = 'Speak';
            updateActionState();
        };

        window.setTimeout(() => {
            speechSynthesisApi.speak(utterance);
        }, 40);
    }

    function updateActionState() {
        const hasText = Boolean(resultContainer.value.trim());

        downloadButton.disabled = !hasText;
        speakButton.disabled = !speechSynthesisApi || !hasText || speechSynthesisApi.speaking;
    }

    function resetRecordingState() {
        recognizing = false;
        startListeningButton.classList.remove('recording');
        recordButtonText.textContent = 'Start Listening';
    }

    function loadVoices() {
        availableVoices = speechSynthesisApi.getVoices();
        updateVoiceHint();
    }

    function findMatchingVoice(languageCode) {
        if (!availableVoices.length) {
            return null;
        }

        return (
            availableVoices.find((voice) => voice.lang === languageCode) ||
            availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(languageCode.toLowerCase())) ||
            availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(languageCode.split('-')[0].toLowerCase())) ||
            null
        );
    }

    function getSelectedLocale() {
        return preferredLocales[languageSelect.value] || languageSelect.value;
    }

    function updateVoiceHint() {
        const selectedLocale = getSelectedLocale();

        if (!speechSynthesisApi) {
            voiceHint.textContent = 'Speaking is not supported in this browser.';
            return;
        }

        const matchedVoice = findMatchingVoice(selectedLocale);

        if (matchedVoice) {
            voiceHint.textContent = `Speaking voice: ${matchedVoice.name} (${matchedVoice.lang})`;
            return;
        }

        voiceHint.textContent = `No installed voice found for ${selectedLocale}. Your browser will use its default voice.`;
    }

    function buildTranscriptValue(interimTranscript = '') {
        return [transcriptBase, transcriptFinal, interimTranscript].filter(Boolean).join(' ').trim();
    }

    function joinTranscript(currentText, nextText) {
        return [currentText, nextText].filter(Boolean).join(' ').trim();
    }
});
