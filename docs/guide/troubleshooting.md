# Troubleshooting

This guide helps you resolve common issues with Honeymelon.

## FFmpeg Issues

### FFmpeg Not Found

**Symptom**: Error message "FFmpeg not found" or "FFmpeg binary not available"

**Solutions**:

1. **Check bundled binaries**:

   ```bash
   ls public/bin/ffmpeg
   ls public/bin/ffprobe
   ```

   If missing, download them:

   ```bash
   npm run download-ffmpeg
   ```

2. **Install system FFmpeg**:

   ```bash
   brew install ffmpeg
   ```

   Verify installation:

   ```bash
   which ffmpeg
   ffmpeg -version
   ```

3. **Set custom path** in Preferences:
   - Open Preferences (`Cmd + ,`)
   - Navigate to FFmpeg Settings
   - Enter full path to FFmpeg binary

### FFmpeg Version Issues

**Symptom**: Unexpected encoding errors or missing codec support

**Check version**:

```bash
ffmpeg -version

```

**Minimum required**: FFmpeg 4.4+
**Recommended**: FFmpeg 6.0+

**Update FFmpeg**:

```bash
brew upgrade ffmpeg

```

### Hardware Acceleration Not Working

**Symptom**: Slow encoding despite hardware acceleration enabled

**Check**:

1. **Verify Apple Silicon**: Hardware acceleration only works on M1+ Macs

   ```bash
   uname -m  # Should output "arm64"
   ```

2. **Check encoder availability**:

   ```bash
   ffmpeg -encoders | grep videotoolbox
   ```

   Should show:

   ```

   h264_videotoolbox
   hevc_videotoolbox
   ```

3. **Disable and re-enable** in Preferences
4. **Try software encoding**: Disable hardware acceleration to compare

## Conversion Errors

### Job Fails Immediately

**Symptom**: Job goes straight to "Failed" state

**Common causes**:

1. **Corrupted source file**:
   - Try opening file in another player (QuickTime, VLC)
   - Run FFprobe manually:

     ```bash
     ffprobe /path/to/file.mkv
     ```

2. **Unsupported format**:
   - Check [Supported Formats](/guide/supported-formats)
   - Verify codec compatibility

3. **File permissions**:
   - Ensure Honeymelon can read the source file
   - Check output directory is writable

**Check logs**:

- Expand the failed job card
- Read the FFmpeg error output
- Look for specific error messages

### Job Fails During Conversion

**Symptom**: Job runs for a while, then fails

**Common causes**:

1. **Insufficient disk space**:
   - Check available disk space
   - Output files may be larger than source

2. **Resource exhaustion**:
   - Reduce concurrent jobs in Preferences
   - Close other resource-intensive apps

3. **Corrupted stream**:
   - File may have corruption partway through
   - Try converting a shorter segment

### Output File is Corrupted

**Symptom**: Conversion completes but output file won't play

**Solutions**:

1. **Verify source file** plays correctly
2. **Try different preset/quality**:
   - Use "Fast" quality for remux
   - Try different container format
3. **Check FFmpeg logs** for warnings
4. **Re-run with verbose logging**:
   - Set log level to "Debug" in Preferences
   - Check for stream mapping issues

## Performance Issues

### Slow Encoding Speed

**Expected speeds** (approximate):

| Operation       | Speed         | FPS            |
| --------------- | ------------- | -------------- |
| Remux (copy)    | 500-1000+ fps | Very fast      |
| H.264 HW encode | 60-150 fps    | Fast           |
| H.265 HW encode | 30-80 fps     | Moderate       |
| H.264 SW encode | 20-60 fps     | Moderate       |
| H.265 SW encode | 5-25 fps      | Slow           |
| VP9 encode      | 3-10 fps      | Very slow      |
| AV1 encode      | 1-5 fps       | Extremely slow |

**If encoding is slower than expected**:

1. **Enable hardware acceleration**:
   - Check Preferences → Hardware Acceleration
   - Only works for H.264/H.265 on Apple Silicon

2. **Use faster preset**:
   - Switch to "Fast" quality tier
   - Use remux-friendly formats

3. **Reduce concurrent jobs**:
   - Lower concurrency in Preferences
   - Gives each job more resources

4. **Check system resources**:
   - Open Activity Monitor
   - Look for CPU/memory bottlenecks
   - Close unnecessary applications

### High CPU/Memory Usage

**Symptom**: System becomes sluggish during conversion

**Solutions**:

1. **Reduce concurrent jobs**:
   - Lower from 2-3 to 1
   - Especially for 4K content

2. **Close other applications**:
   - Free up system resources
   - Disable background processes

3. **Use hardware acceleration**:
   - Reduces CPU load significantly
   - Enable in Preferences if disabled

4. **Process in smaller batches**:
   - Don't queue 100+ files at once
   - Process in groups of 10-20

### Application Freezing

**Symptom**: UI becomes unresponsive

**Immediate action**:

1. Wait 10-30 seconds (may be temporary)
2. If frozen, force quit: `Cmd + Option + Esc`

**Prevention**:

1. **Update to latest version**
2. **Reduce concurrent jobs**
3. **Check for corrupted files** in queue
4. **Disable hardware acceleration** (test if it helps)

## File Issues

### Input File Not Recognized

**Symptom**: Dragged file is ignored or not added to queue

**Check**:

1. **Verify file extension**:
   - Must be a supported media format
   - See [Supported Formats](/guide/supported-formats)

2. **Check file integrity**:

   ```bash
   ffprobe /path/to/file.mkv
   ```

3. **Rename file**:
   - Remove special characters
   - Ensure proper extension

### Output File Already Exists

**Symptom**: Warning about existing output file

**Honeymelon's behavior**:

- Never overwrites existing files
- Automatically appends number (e.g., `-converted-1.mp4`)

**Solutions**:

1. **Accept automatic numbering** (recommended)
2. **Delete or move existing file**
3. **Change output directory** in Preferences
4. **Use custom suffix** to avoid conflicts

### Output File Larger Than Expected

**Symptom**: Output file is bigger than source

**Possible reasons**:

1. **Transcoding to less efficient codec**:
   - H.264 → ProRes will increase size
   - Compressed → uncompressed increases size

2. **High quality settings**:
   - "High" quality tier uses higher bitrates
   - CRF 18 produces larger files than CRF 23

3. **Audio upsampling**:
   - Converting to higher bitrate audio

**Solutions**:

1. **Use "Balanced" quality** for smaller files
2. **Choose efficient codec** (H.265 over H.264)
3. **Remux instead of transcode** ("Fast" quality)

## UI Issues

### Progress Not Updating

**Symptom**: Progress bar stuck at same percentage

**Possible causes**:

1. **Very slow encoding**:
   - AV1/VP9 can be extremely slow
   - Check FPS indicator (should be > 0)

2. **Actual freeze**:
   - Wait 30 seconds
   - Check Activity Monitor for FFmpeg processes

3. **UI rendering issue**:
   - Minimize and restore window
   - Check logs for actual progress

### Logs Not Showing

**Symptom**: Log section is empty or not updating

**Solutions**:

1. **Increase log level** to "Info" or "Debug" in Preferences
2. **Restart the application**
3. **Check console** for JavaScript errors

### Preferences Not Saving

**Symptom**: Settings revert after restart

**Check**:

1. **File permissions**:

   ```bash
   ls -la ~/Library/Application\ Support/com.honeymelon.app/
   ```

2. **Manually edit config**:

   ```bash
   nano ~/Library/Application\ Support/com.honeymelon.app/settings.json
   ```

3. **Reset preferences**:
   - Delete settings file
   - Restart app to regenerate

## macOS-Specific Issues

### Gatekeeper Warning

**Symptom**: "App can't be opened because it is from an unidentified developer"

**Solution**:

1. Open **System Settings** → **Privacy & Security**
2. Click **"Open Anyway"** next to Honeymelon warning
3. Confirm you want to open the app

Or use terminal:

```bash
xattr -cr /Applications/Honeymelon.app

```

### File Access Permissions

**Symptom**: Honeymelon can't read/write files

**Grant permissions**:

1. Open **System Settings** → **Privacy & Security** → **Files and Folders**
2. Enable access for Honeymelon
3. Restart the application

### Rosetta Warning

**Symptom**: Prompted to install Rosetta on Apple Silicon Mac

**Issue**: You might have downloaded an Intel build

**Solution**:

- Ensure you downloaded the ARM64 build
- Check with: `file /Applications/Honeymelon.app/Contents/MacOS/honeymelon`
- Should output: `Mach-O 64-bit executable arm64`

## Development Issues

### Build Failures

**Symptom**: `npm run tauri:build` fails

**Common causes**:

1. **Missing Rust**:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Missing Node dependencies**:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Outdated Rust toolchain**:

   ```bash
   rustup update
   ```

4. **Xcode Command Line Tools**:

   ```bash
   xcode-select --install
   ```

### Development Server Won't Start

**Symptom**: `npm run tauri:dev` fails

**Solutions**:

1. **Check port availability**:
   - Default port 1420 may be in use
   - Kill conflicting process

2. **Clear cache**:

   ```bash
   rm -rf node_modules/.vite
   npm run tauri:dev
   ```

3. **Check logs**:
   - Look for error messages in terminal
   - Check for TypeScript errors

## Getting More Help

### Check Logs

Application logs are located at:

```

~/Library/Logs/com.honeymelon.app/

```

### Enable Debug Mode

1. Open Preferences
2. Set Log Level to "Debug"
3. Reproduce the issue
4. Check logs for detailed information

### Report an Issue

If you can't resolve the issue:

1. **Gather information**:
   - macOS version: `sw_vers`
   - Honeymelon version: Check "About" dialog
   - FFmpeg version: `ffmpeg -version`
   - Error logs from app

2. **Create a minimal reproduction**:
   - Single file that causes the issue
   - Specific steps to reproduce

3. **Report on GitHub**:
   - Go to https://github.com/honeymelon-app/honeymelon/issues
   - Provide all gathered information
   - Include logs if applicable

### Community Support

- **GitHub Discussions**: Ask questions
- **GitHub Issues**: Report bugs
- **Email Support**: tjthavarshan@gmail.com

## Common Error Messages

### "No such file or directory"

**Cause**: File path invalid or file moved

**Solution**: Ensure source file exists at expected location

### "Permission denied"

**Cause**: Insufficient file permissions

**Solution**: Grant file access in macOS Privacy Settings

### "Encoder not found"

**Cause**: FFmpeg missing required encoder

**Solution**: Reinstall FFmpeg with all codecs enabled:

```bash
brew reinstall ffmpeg

```

### "Invalid data found when processing input"

**Cause**: Corrupted or unsupported file

**Solution**: Verify file integrity with another player

### "Cannot allocate memory"

**Cause**: Insufficient RAM for operation

**Solution**: Reduce concurrent jobs, close other apps

## Preventive Measures

### Regular Maintenance

1. **Keep FFmpeg updated**:

   ```bash
   brew upgrade ffmpeg
   ```

2. **Update Honeymelon** to latest version

3. **Monitor disk space**:
   - Keep at least 10-20 GB free
   - Clear old conversions

4. **Restart periodically**:
   - Restart app after heavy batch processing
   - Restart Mac weekly

### Best Practices

1. **Test with one file first** before batch processing
2. **Use appropriate quality settings** for your needs
3. **Monitor system resources** during heavy workloads
4. **Keep source files intact** until conversion verified
5. **Backup important files** before conversion

## Next Steps

Still having issues? Consult:

- [Guide](/guide/getting-started) - Basic usage
- [Preferences](/guide/preferences) - Configuration options
- [Architecture](/architecture/overview) - How it works
- [GitHub Issues](https://github.com/honeymelon-app/honeymelon/issues) - Known issues
