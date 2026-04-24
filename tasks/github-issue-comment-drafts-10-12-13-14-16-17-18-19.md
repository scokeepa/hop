# GitHub Issue Comment Drafts: #10, #12, #13, #14, #16, #17, #18, #19

이 문서는 HOP 레포에서 처리한 범위, 아직 실기기 확인이 필요한 범위, 그리고 `rhwp` upstream으로 이관해야 할 수 있는 조건을 이슈별 GitHub 댓글 초안 형태로 정리한다.

## Overall Summary Draft

```markdown
이번 이슈 묶음은 `third_party/rhwp`를 직접 수정하지 않고 HOP 소유 레이어(`apps/studio-host`, `apps/desktop`, release workflow/docs)에서 처리했습니다.

해결 범위:
- #10: Windows 저장 손상 방지를 위해 HWP 바이트를 대용량 IPC로 넘기지 않고 staging 파일 경유 + native 검증 + atomic replace 경로로 처리했습니다. staging 파일 write 후 close와 size 검증도 추가했습니다.
- #12: fullscreen/windowed 전환과 viewport resize 후 visible page left를 재계산하도록 보정했습니다.
- #13: macOS에서 F5 의존 없이 셀 선택 모드에 들어갈 수 있는 HOP 명령, 단축키/메뉴/컨텍스트 메뉴/마우스 경로를 추가했습니다.
- #14: Linux AppImage IME runtime 보정과 WebKitGTK IME를 위한 캐럿 근처 입력 anchor 보정을 추가했습니다.
- #16/#17: desktop native font catalog, installed font precedence, file-backed vendor/Hancom font loading, editor/PDF export font discovery 통합을 추가했습니다.
- #18: 제품 스펙이 아직 명확하지 않아 이번 릴리즈에서는 구현하지 않았습니다.
- #19: Linux build baseline을 Ubuntu 22.04로 낮추고, AppImage 포함 ELF 전체의 `GLIBC_*` 요구 버전을 CI에서 검사하도록 강화했습니다.

자동 검증:
- `pnpm test`
- `pnpm run build:studio`
- `pnpm run clippy:desktop`
- `git diff --check`

남은 확인:
- Windows/Linux/macOS 실기기 GUI smoke는 현재 환경에서 직접 실행하지 못했습니다. 코드와 단위 테스트, CI 검증으로 막을 수 있는 범위는 처리했고, 실제 플랫폼 확인은 릴리즈 전 smoke checklist로 남깁니다.

현재 기준으로 반드시 `rhwp` upstream에 이관해야 하는 항목은 없습니다. 다만 아래 이슈별 "rhwp 이관 조건"에 해당하는 증상이 HOP 보정 후에도 재현되면 upstream engine/API 이슈로 분리할 수 있습니다.

요청:
- 최신 빌드로 테스트한 뒤 문제가 해결됐으면 이 이슈는 close하겠습니다.
- 문제가 계속 남아 있으면 사용 OS/버전, HOP 빌드 또는 commit, 대상 문서 형식, 기대 동작, 실제 현상, 최소 재현 순서, 가능하면 샘플 문서 또는 로그를 새 댓글로 남겨 주세요.
- 확인 결과 HOP packaging/UI/bridge 문제가 아니라 `rhwp` parser/renderer/editor model/exporter 문제로 좁혀지면, 같은 재현 정보로 `rhwp` upstream 쪽에 별도 이슈를 남겨 주세요.
```

## Issue #10 Draft: Windows 저장/다른 이름 저장 시 파일 손상

```markdown
HOP 레이어에서 해결 가능한 저장 손상 방어를 적용했습니다.

원인으로 본 지점:
- 기존 HOP 저장 경로는 프론트 WASM이 만든 HWP 바이트를 Tauri invoke로 직접 넘기는 구조였고, Windows WebView/IPC에서 대용량 바이너리 전달이 취약할 수 있었습니다.
- upstream `rhwp` 자체 저장에서는 재현되지 않는다는 제보가 있었으므로, 우선 HOP desktop save pipeline 문제로 판단했습니다.

적용한 해결:
- 프론트에서 저장 대상 옆 staging 파일에 chunk write합니다.
- 파일 핸들을 명시적으로 close한 뒤 실제 staging 파일 크기가 export된 HWP byte length와 같은지 검증합니다.
- Rust native command가 staging 파일을 다시 읽고 HWP parse/convert 검증을 통과한 경우에만 target path를 atomic replace합니다.
- HWPX 원본 직접 overwrite는 여전히 안전하지 않으므로 차단하고, HWP로 `다른 이름으로 저장`하도록 유지했습니다.

검증:
- staging write/close/size-check/native commit 순서 단위 테스트 추가
- incomplete staging file이면 native commit 전에 실패하는 회귀 테스트 추가
- Rust native staged save test 유지
- `pnpm test`, `pnpm run build:studio`, `pnpm run clippy:desktop` 통과

남은 확인:
- Windows 실기기에서 기존 파일 저장, 다른 이름으로 저장, 파일 연결로 연 문서 재저장 smoke가 필요합니다.

rhwp 이관 조건:
- HOP staging + native parse 검증 이후에도 동일 문서가 저장 직후 깨지고, 저장된 byte가 `rhwp`의 `export_hwp_native()` 산출물 자체에서 이미 손상된 것으로 확인되는 경우에만 `rhwp` export/serialization 이슈로 이관합니다.

요청:
- 최신 빌드에서 위 저장 smoke가 모두 통과하면 이 이슈는 close하겠습니다.
- 여전히 손상되면 Windows 버전, 저장 방식(저장/다른 이름으로 저장/파일 연결 후 저장), 원본 파일 형식, 손상된 결과 파일의 증상, 최소 재현 문서를 구체적으로 남겨 주세요.
- staging 검증 이후 `rhwp` export 산출물 자체가 손상된 것으로 확인되면 동일 재현 문서와 함께 `rhwp` upstream export/serialization 이슈로 남겨 주세요.
```

## Issue #12 Draft: macOS fullscreen 후 A4 페이지 중앙 정렬 깨짐

```markdown
HOP studio-host 쪽 viewport/page positioning 문제로 보고 수정했습니다.

원인으로 본 지점:
- HOP는 upstream의 CSS 기반 중앙 정렬 대신 explicit pixel left 계산을 사용합니다.
- fullscreen에서 windowed로 돌아오는 resize 시 이미 렌더된 canvas의 left가 다시 계산되지 않아 stale position이 남을 수 있었습니다.

적용한 해결:
- visible/active canvas에 대해 viewport resize 후 display layout을 다시 적용하는 경로를 추가했습니다.
- single column/grid mode 모두 같은 page-left helper를 사용하도록 정리했습니다.
- canvas display size와 devicePixelRatio 추론도 함께 보정했습니다.

검증:
- resize 후 canvas left가 재계산되는 Vitest 추가
- `pnpm test`, `pnpm run build:studio` 통과

남은 확인:
- macOS 실기기에서 문서 열기 -> fullscreen 진입 -> windowed 복귀 -> page centering/caret hit-test/selection overlay smoke가 필요합니다.

rhwp 이관 조건:
- HOP canvas left가 정상 재계산되는데도 upstream이 제공하는 page/cursor rect 자체가 fullscreen 전후 다른 좌표계를 반환하는 것으로 확인될 때만 `rhwp` 또는 upstream studio viewport API 이슈로 이관합니다.

요청:
- 최신 빌드에서 fullscreen -> windowed 전환 후 페이지 중앙 정렬과 클릭 위치가 정상이라면 이 이슈는 close하겠습니다.
- 계속 어긋나면 macOS 버전, 디스플레이 배율/외부 모니터 여부, fullscreen 전후 창 크기, zoom 값, 어긋난 스크린샷과 정확한 재현 순서를 남겨 주세요.
- HOP canvas 위치는 정상인데 upstream page/cursor 좌표가 잘못 반환되는 것으로 확인되면 해당 좌표/문서/재현 순서로 `rhwp` 또는 upstream studio viewport 이슈를 남겨 주세요.
```

## Issue #13 Draft: macOS 표 셀 선택 및 병합 불가

```markdown
HOP에서 접근 가능한 셀 선택 진입 경로를 추가했습니다.

원인으로 본 지점:
- upstream의 셀 선택 진입은 `F5` 중심인데, macOS에서는 function key 기본 동작 때문에 일반 사용자가 접근하기 어렵습니다.
- HOP mouse logic은 이미 cell-selection mode에 들어간 뒤의 range/toggle 동작에 치우쳐 있어, 일반 cell caret 상태에서 선택 모드로 들어가는 HOP 소유 경로가 부족했습니다.

적용한 해결:
- `table:cell-selection-enter` 명령을 추가했습니다.
- macOS native menu와 in-app shortcut/context menu에서 셀 블록 선택에 접근할 수 있게 했습니다.
- cell 내부 일반 클릭/수정자 클릭 경로에서 selection phase를 진행할 수 있도록 보정했습니다.
- upstream selection state machine을 재사용하고 `third_party/rhwp`는 수정하지 않았습니다.

검증:
- table command test, shortcut-map test, mouse selection behavior test 추가
- `pnpm test`, `pnpm run build:studio` 통과

남은 확인:
- macOS 실기기에서 표 생성 -> 셀 선택 진입 -> 여러 셀 선택 -> 셀 병합까지 end-to-end smoke가 필요합니다.

rhwp 이관 조건:
- HOP 경로로 cell-selection mode 진입과 range selection은 정상인데, 실제 merge command가 document model을 잘못 바꾸거나 저장/렌더링 결과가 깨지는 경우에는 `rhwp` table operation/model 이슈로 분리합니다.

요청:
- 최신 빌드에서 메뉴/단축키/컨텍스트 메뉴로 셀 선택 후 병합까지 정상 동작하면 이 이슈는 close하겠습니다.
- 여전히 실패하면 macOS 버전, 사용한 진입 경로, 표 구조, 선택한 셀 범위, 병합 명령 실행 후 실제 현상, 가능하면 샘플 문서와 화면 녹화를 남겨 주세요.
- 셀 선택 UI는 정상인데 병합 결과 document model, 저장 결과, 렌더링이 깨지는 경우에는 같은 샘플 문서로 `rhwp` table operation/model 이슈를 남겨 주세요.
```

## Issue #14 Draft: Linux 한글 입력 불가

```markdown
HOP Linux desktop runtime과 WebKitGTK IME 입력 anchor를 보정했습니다.

원인으로 본 지점:
- AppImage 환경에서는 bundled GTK immodules cache가 host fcitx/fcitx5/ibus 모듈과 맞지 않아 IME가 붙지 않을 수 있습니다.
- editor 입력용 hidden textarea가 화면 밖/완전 투명 상태라 WebKitGTK IME composition context가 안정적으로 형성되지 않을 가능성이 있습니다.

적용한 해결:
- AppImage runtime에서 요청된 `GTK_IM_MODULE` 또는 `XMODIFIERS`를 읽고, bundled cache가 해당 module을 지원하지 않으면 host GTK immodules cache를 사용하도록 보정했습니다.
- Linux desktop에서는 입력용 textarea를 offscreen이 아니라 실제 caret 근처에 매우 작은 near-transparent fixed element로 배치하도록 보정했습니다.
- macOS/Windows/browser/iOS 경로는 기존 동작을 유지했습니다.

검증:
- Linux runtime helper Rust tests 유지
- textarea anchor 계산 Vitest 추가
- `pnpm test`, `pnpm run build:studio`, `pnpm run clippy:desktop` 통과

남은 확인:
- Ubuntu 22.04/24.04에서 AppImage 실행 후 fcitx5 또는 ibus-hangul로 한글 입력 smoke가 필요합니다.
- AppImage에서 여전히 불안정하면 `.deb` 또는 `.rpm` 패키지로도 비교 확인해야 합니다.

rhwp 이관 조건:
- Linux IME가 composition 이벤트를 정상 전달하고 HOP textarea anchor도 정상인데, upstream `input-handler-text`의 composition update/end 처리 때문에 자모 분리, 중복 입력, undo 기록 오류가 발생하는 경우에는 `rhwp-studio` IME handling 이슈로 이관합니다.

요청:
- 최신 빌드에서 Ubuntu/AppImage와 사용 중인 IME로 한글 조합 입력이 정상이라면 이 이슈는 close하겠습니다.
- 계속 실패하면 배포판/버전, X11 또는 Wayland, `GTK_IM_MODULE`, `XMODIFIERS`, 사용 IME(fcitx5/ibus-hangul 등), AppImage/.deb/.rpm 여부, 입력한 문자열과 실제 입력 결과를 구체적으로 남겨 주세요.
- composition 이벤트는 정상인데 자모 분리, 중복 입력, undo 기록 오류가 upstream text input 처리에서 발생하는 것으로 확인되면 동일 조건으로 `rhwp-studio` IME handling 이슈를 남겨 주세요.
```

## Issue #16 Draft: macOS 설치 글꼴 적용 불가

```markdown
HOP desktop font discovery/precedence 문제로 보고 수정했습니다.

원인으로 본 지점:
- 기존 HOP font-loader는 일부 vendor font family를 bundled substitute font-face로 먼저 등록할 수 있었습니다.
- macOS WebKit 기반 Tauri에서는 Chromium 중심의 `queryLocalFonts()`만으로 installed fonts를 안정적으로 찾을 수 없습니다.
- 실제 설치된 font family가 있는데 substitute `@font-face`가 같은 family name으로 등록되면 실제 폰트가 shadow될 수 있었습니다.

적용한 해결:
- Rust native font catalog를 추가해 desktop installed fonts를 수집합니다.
- native catalog에서 발견된 installed family는 bundled substitute registration 대상에서 제외합니다.
- toolbar, 글자 모양 dialog, style edit dialog 모두 font load 후 `fontId`를 생성하도록 통합했습니다.
- optional local font detection 실패가 editor startup을 막지 않도록 best-effort 경로로 유지했습니다.

검증:
- font-loader precedence tests
- font-application tests
- toolbar/style-edit/format command tests
- `pnpm test`, `pnpm run build:studio`, `pnpm run clippy:desktop` 통과

남은 확인:
- macOS 실기기에서 새 폰트 설치 -> HOP 재실행 -> font picker 표시 -> toolbar/dialog/style edit에서 실제 글꼴 적용 smoke가 필요합니다.

rhwp 이관 조건:
- HOP에서 실제 installed font를 찾고 `fontId`도 정상 생성했는데, upstream render/export가 해당 font id/family를 무시하는 것으로 확인될 때만 `rhwp` font resolution/rendering 이슈로 이관합니다.

요청:
- 최신 빌드에서 설치 글꼴이 toolbar, 글자 모양 dialog, style edit dialog에서 모두 실제 글꼴로 적용되면 이 이슈는 close하겠습니다.
- 계속 fallback으로 보이면 macOS 버전, 글꼴명, 설치 위치, 선택한 적용 경로(toolbar/dialog/style), 화면 렌더링과 PDF export 차이, 가능하면 샘플 문서를 남겨 주세요.
- HOP가 font catalog와 `fontId`를 정상 생성했는데 `rhwp` renderer/exporter가 이를 무시하는 것으로 확인되면 해당 font family와 샘플 문서로 `rhwp` font resolution/rendering 이슈를 남겨 주세요.
```

## Issue #17 Draft: 로컬/한컴/vendor font file 읽기

```markdown
HOP desktop native font catalog와 file-backed font loading으로 처리했습니다.

원인으로 본 지점:
- `queryLocalFonts()`는 installed fonts 중심이라 Hancom Office 같은 vendor app directory 안의 font file까지 안정적으로 노출하지 않습니다.
- editor rendering과 PDF export가 서로 다른 font discovery 규칙을 쓰면 화면과 출력이 달라질 수 있습니다.

적용한 해결:
- Rust `font_catalog`를 추가해 system-installed font와 file-backed font를 구분합니다.
- Windows에서는 user font directory와 Hancom versioned shared TTF root(`Program Files`/`Program Files (x86)` 아래 `Hnc/Office*/HOffice*/Shared/TTF`)를 bounded scan합니다.
- frontend는 file-backed font를 필요 시 native command로 읽어 `FontFace`로 lazy registration합니다.
- PDF export도 같은 desktop extra font dirs를 사용하도록 통합했습니다.
- 지원 root 밖의 임의 font file은 읽지 않도록 제한했습니다.

검증:
- Windows Hancom path discovery test
- local font normalization/path boundary test
- frontend file-backed font loading tests
- PDF/export font database 경로 통합
- `pnpm test`, `pnpm run build:studio`, `pnpm run clippy:desktop` 통과

남은 확인:
- Windows 실기기에서 Hancom font가 설치된 환경으로 font picker/editor rendering/PDF export parity smoke가 필요합니다.

rhwp 이관 조건:
- HOP가 font file을 정상 발견하고 editor/PDF path에 넘겼는데도 `rhwp` rendering/export가 특정 font face/style/index를 잘못 선택하는 경우에는 `rhwp` font matching 또는 HWP font metadata 이슈로 이관합니다.

요청:
- 최신 빌드에서 Hancom/vendor font가 editor와 PDF export에 일관되게 적용되면 이 이슈는 close하겠습니다.
- 계속 누락되면 Windows 버전, Hancom 설치 버전/경로, 글꼴 파일명 또는 family name, HOP font picker 표시 여부, editor/PDF 각각의 실제 현상, 샘플 문서를 남겨 주세요.
- HOP가 font file을 발견하고 로드했는데 특정 face/style/index 선택이 틀리는 경우에는 같은 font file 정보와 샘플 문서로 `rhwp` font matching 또는 HWP font metadata 이슈를 남겨 주세요.
```

## Issue #18 Draft: Claude Code Injector

```markdown
이번 릴리즈에서는 구현하지 않았습니다.

판단:
- 현재 이슈 설명만으로는 사용자 플로우, 외부 도구 실행 여부, 문서 내용/로컬 경로 취급, 보안 경계, 성공 기준이 충분히 명확하지 않습니다.
- 스펙이 불명확한 상태에서 HOP 도구 메뉴나 프롬프트 UI를 추가하면 제품 동작으로 오해될 수 있어 보류했습니다.
- `third_party/rhwp`는 수정하지 않았고, HOP에도 이 기능 관련 product code를 추가하지 않았습니다.

필요한 추가 정보:
- 이 기능이 실제로 해야 하는 작업 범위
- 문서 본문, 파일 경로, 선택 영역을 자동 포함해도 되는지 여부
- 외부 Claude/CLI를 실행해야 하는지, 단순 프롬프트 복사 UI인지 여부
- 실패/취소/권한 처리 방식
- acceptance criteria와 최소 재현 가능한 사용 시나리오

요청:
- 위 스펙이 정리되면 HOP product issue로 다시 설계하겠습니다.
- 단순히 `rhwp` 문서 엔진이나 API가 제공해야 하는 기능이라면, 필요한 engine/API 요구사항을 분리해 `rhwp` upstream 이슈로 남겨 주세요.
- 현재 상태에서는 구현하지 않은 것이 의도된 결과이므로, 이 이슈는 스펙 보완 전까지 open 상태로 두는 것이 맞습니다.

rhwp 이관 조건:
- 제품 UI/워크플로우는 HOP 범위입니다.
- 문서 엔진이 제공해야 하는 API, 변환, 분석 기능이 필요하다는 결론이 나면 그 API 요구사항만 `rhwp` upstream으로 분리합니다.
```

## Issue #19 Draft: Ubuntu 22.04 glibc 호환성

```markdown
Linux release workflow의 ABI baseline을 Ubuntu 22.04로 낮추고 검증을 추가했습니다.

원인으로 본 지점:
- 기존 Linux build가 Ubuntu 24.04 runner 기준이면 Ubuntu 22.04에서 더 최신 `glibc` requirement 때문에 실행 실패할 수 있습니다.
- AppImage는 내부 payload와 runtime ELF도 함께 고려해야 하므로 단순히 Rust binary만 확인하면 부족합니다.

적용한 해결:
- Linux x64 build runner를 `ubuntu-22.04`로 변경했습니다.
- CI에서 desktop binary, AppImage 자체, AppImage extract 내부 ELF 전체의 최대 `GLIBC_*` requirement를 검사합니다.
- `GLIBC_2.35`를 초과하면 workflow가 실패하도록 했습니다.
- AppImage `--appimage-extract` smoke와 ABI report artifact를 추가했습니다.
- release docs에 Ubuntu 22.04 baseline과 Linux package 안내를 업데이트했습니다.

검증:
- workflow YAML parse 확인
- local `git diff --check` 확인
- 실제 GitHub Actions run은 아직 필요합니다.

남은 확인:
- GitHub Actions Linux x64 build를 실제로 실행해 ABI report와 AppImage extract smoke 결과를 확인해야 합니다.
- Ubuntu 22.04 실기기/VM에서 AppImage 실행 smoke가 필요합니다.

rhwp 이관 조건:
- 없음. 이 문제는 HOP packaging/release baseline 문제이며 upstream `rhwp`와 직접 관련이 없습니다.

요청:
- 최신 Linux artifact가 Ubuntu 22.04에서 실행되고 ABI report가 `GLIBC_2.35` 이하라면 이 이슈는 close하겠습니다.
- 계속 실행되지 않으면 배포판/버전, AppImage/.deb/.rpm 여부, 실행 명령, 터미널 오류, `ldd --version`, 가능하면 ABI report artifact를 남겨 주세요.
- 이 문제는 HOP packaging/release baseline 문제라서 `rhwp` upstream 이관 대상은 아닙니다.
```

## Remaining Manual Smoke Checklist

```markdown
릴리즈 전 권장 smoke:

- Windows:
  - 기존 `.hwp` 열기 -> 수정 -> 저장 -> 재열기
  - 다른 이름으로 저장 -> 재열기
  - 파일 연결/drag-drop으로 연 문서 재저장
  - Hancom/vendor font가 있는 환경에서 editor rendering과 PDF export 비교

- macOS:
  - fullscreen -> windowed 후 page centering/caret hit-test 확인
  - 표 생성 -> 셀 선택 진입 -> range selection -> 병합 확인
  - 새 설치 폰트가 toolbar/dialog/style edit에서 실제 적용되는지 확인

- Linux:
  - Ubuntu 22.04에서 AppImage 실행
  - fcitx5 또는 ibus-hangul 한글 입력 확인
  - AppImage가 불안정하면 `.deb`/`.rpm` package와 비교
  - GitHub Actions ABI report에서 `max_glibc <= GLIBC_2.35` 확인
```
