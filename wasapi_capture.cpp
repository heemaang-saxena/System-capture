#define _WIN32_DCOM
#define NOMINMAX
#include <napi.h>
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <functiondiscoverykeys_devpkey.h>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <vector>
#include <iostream>

using namespace Napi;

struct AudioData {
    std::vector<int16_t> samples;
    int channels;
    int sampleRate;
};

struct CaptureContext {
    std::queue<AudioData> audioQueue;
    std::mutex queueMutex;
    Napi::ThreadSafeFunction tsfn;
    std::thread captureThread;
    std::atomic<bool> capturing{false};
    bool loopback = false;
};

// Two global contexts: one for mic, one for loopback
CaptureContext g_loopbackCtx;
CaptureContext g_micCtx;

inline int16_t FloatToInt16(float f) {
    f = std::max(-1.0f, std::min(1.0f, f));
    return (f < 0) ? static_cast<int16_t>(f * 32768) : static_cast<int16_t>(f * 32767);
}
inline int16_t Int32ToInt16(int32_t s) { return (int16_t)(s >> 16); }

void DoCapture(CaptureContext* ctx, int deviceIndex);

void CallbackWrapper(Napi::Env env, Napi::Function jsCallback, AudioData* data) {
    if (jsCallback != nullptr) {
        Napi::Buffer<int16_t> buffer = Napi::Buffer<int16_t>::Copy(env, data->samples.data(), data->samples.size());
        jsCallback.Call({buffer, Napi::Number::New(env, data->channels), Napi::Number::New(env, data->sampleRate)});
    }
    delete data;
}

void StartCapture(CaptureContext* ctx, const Napi::CallbackInfo& info, bool loopback) {
    Napi::Env env = info.Env();
    
    if (ctx->capturing) return;

    if (!info[0].IsFunction()) {
        Napi::TypeError::New(env, "First arg must be callback").ThrowAsJavaScriptException();
        return;
    }

    int deviceIndex = -1;
    if (info.Length() > 1 && info[1].IsNumber()) {
        deviceIndex = info[1].As<Napi::Number>().Int32Value();
    }

    ctx->capturing = true;
    ctx->loopback = loopback;

    // Create thread-safe function
    ctx->tsfn = Napi::ThreadSafeFunction::New(
        env,
        info[0].As<Napi::Function>(),
        "AudioCapture",
        0,
        1
    );

    ctx->captureThread = std::thread(DoCapture, ctx, deviceIndex);
}

void StopCapture(CaptureContext* ctx) {
    ctx->capturing = false;
    if (ctx->captureThread.joinable()) ctx->captureThread.join();

    if (ctx->tsfn) {
        ctx->tsfn.Release();
    }
}

// === Wrappers for JS ===
void StartLoopbackCapture(const Napi::CallbackInfo& info) {
    StartCapture(&g_loopbackCtx, info, true);
}

void StopLoopbackCapture(const Napi::CallbackInfo& info) {
    StopCapture(&g_loopbackCtx);
}

void StartMicCapture(const Napi::CallbackInfo& info) {
    StartCapture(&g_micCtx, info, false);
}

void StopMicCapture(const Napi::CallbackInfo& info) {
    StopCapture(&g_micCtx);
}

// === Core capture implementation ===
void DoCapture(CaptureContext* ctx, int deviceIndex) {
    HRESULT hr;
    CoInitializeEx(nullptr, COINIT_MULTITHREADED);

    IMMDeviceEnumerator* enumerator = nullptr;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr,
        CLSCTX_ALL, IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) { std::cerr << "CoCreateInstance failed\n"; return; }

    IMMDeviceCollection* deviceCollection = nullptr;
    EDataFlow flow = ctx->loopback ? eRender : eCapture;
    enumerator->EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE, &deviceCollection);
    UINT count; deviceCollection->GetCount(&count);

    std::wcout << L"Found " << count << (ctx->loopback ? L" render" : L" capture") << L" devices:\n";
    for (UINT i = 0; i < count; i++) {
        IMMDevice* dev = nullptr; deviceCollection->Item(i, &dev);
        IPropertyStore* ps; dev->OpenPropertyStore(STGM_READ, &ps);
        PROPVARIANT var; PropVariantInit(&var);
        ps->GetValue(PKEY_Device_FriendlyName, &var);
        std::wcout << L"[" << i << L"]: " << var.pwszVal << std::endl;
        PropVariantClear(&var); ps->Release(); dev->Release();
    }

    IMMDevice* device = nullptr;
    if (deviceIndex >= 0 && (UINT)deviceIndex < count) {
        deviceCollection->Item(deviceIndex, &device);
    } else {
        enumerator->GetDefaultAudioEndpoint(flow, eConsole, &device);
    }
    deviceCollection->Release(); enumerator->Release();

    IAudioClient* audioClient = nullptr;
    device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&audioClient);

    WAVEFORMATEX* deviceFormat = nullptr;
    audioClient->GetMixFormat(&deviceFormat);

    WAVEFORMATEX waveFormat = {};
    waveFormat.wFormatTag = WAVE_FORMAT_PCM;
    waveFormat.nChannels = deviceFormat->nChannels;
    waveFormat.nSamplesPerSec = deviceFormat->nSamplesPerSec;
    waveFormat.wBitsPerSample = 16;
    waveFormat.nBlockAlign = waveFormat.nChannels * waveFormat.wBitsPerSample / 8;
    waveFormat.nAvgBytesPerSec = waveFormat.nSamplesPerSec * waveFormat.nBlockAlign;
    waveFormat.cbSize = 0;

    int sampleRate = waveFormat.nSamplesPerSec;
    int channels   = waveFormat.nChannels;

    REFERENCE_TIME hnsRequested = 10000000; // 1s buffer
    HANDLE hEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);

    DWORD flags = ctx->loopback ? AUDCLNT_STREAMFLAGS_LOOPBACK : 0;
    hr = audioClient->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        flags | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
        hnsRequested,
        0,
        &waveFormat,
        nullptr
    );
    if (FAILED(hr)) {
        std::cerr << "Initialize failed (hr=" << std::hex << hr << ")\n";
        device->Release(); CoTaskMemFree(deviceFormat); return;
    }

    audioClient->SetEventHandle(hEvent);

    IAudioCaptureClient* captureClient;
    audioClient->GetService(IID_PPV_ARGS(&captureClient));

    audioClient->Start();

    while (ctx->capturing) {
        DWORD wait = WaitForSingleObject(hEvent, 2000);
        if (wait != WAIT_OBJECT_0) continue;

        UINT32 packetFrames;
        captureClient->GetNextPacketSize(&packetFrames);
        while (packetFrames != 0) {
            BYTE* data;
            UINT32 frames;
            DWORD flags;
            captureClient->GetBuffer(&data, &frames, &flags, nullptr, nullptr);

            std::vector<int16_t> buffer;
            buffer.reserve(frames * channels);

            if (waveFormat.wBitsPerSample == 16) {
                int16_t* sData = (int16_t*)data;
                buffer.insert(buffer.end(), sData, sData + frames * channels);
            } else if (waveFormat.wBitsPerSample == 32) {
                int32_t* sData = (int32_t*)data;
                for (UINT32 i = 0; i < frames * channels; i++)
                    buffer.push_back(Int32ToInt16(sData[i]));
            } else {
                float* fData = (float*)data;
                for (UINT32 i = 0; i < frames * channels; i++)
                    buffer.push_back(FloatToInt16(fData[i]));
            }

            AudioData* ad = new AudioData{ std::move(buffer), channels, sampleRate };
            
            auto status = ctx->tsfn.BlockingCall(ad, CallbackWrapper);
            if (status != napi_ok) {
                delete ad;
            }

            captureClient->ReleaseBuffer(frames);
            captureClient->GetNextPacketSize(&packetFrames);
        }
    }

    audioClient->Stop();
    captureClient->Release();
    audioClient->Release();
    device->Release();
    CoTaskMemFree(deviceFormat);
    CloseHandle(hEvent);
    CoUninitialize();
}

// === Init ===
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    std::cout << "✅ Init called, exporting functions..." << std::endl;

    exports.Set("startLoopbackCapture", Napi::Function::New(env, StartLoopbackCapture));
    exports.Set("stopLoopbackCapture", Napi::Function::New(env, StopLoopbackCapture));
    exports.Set("startMicCapture", Napi::Function::New(env, StartMicCapture));
    exports.Set("stopMicCapture", Napi::Function::New(env, StopMicCapture));

    return exports;
}

NODE_API_MODULE(wasapi_capture, Init)
