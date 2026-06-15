# CargoGrid / SlotWise — Warehouse & Port Storage Optimization Simulator

## 1. Project Overview

**CargoGrid** là một project mã nguồn mở mô phỏng và tối ưu việc sắp xếp hàng hóa trong hệ thống kho, cảng, bãi chứa và các khu lưu trữ logistics.

Mục tiêu chính của project không phải là làm một app CRUD quản lý kho thông thường, mà là xây dựng một **algorithm-heavy portfolio project** tập trung vào:

- Tìm kho trống phù hợp nhất cho từng loại hàng.
- Tối ưu vị trí đặt hàng trong kho dựa trên nhiều ràng buộc.
- Tính toán tuyến đường di chuyển hợp lệ giữa cảng, cổng, kho, dock và slot.
- Visualize toàn bộ hệ thống kho/cảng trên web.
- So sánh các thuật toán sắp xếp bằng benchmark.
- Giải thích vì sao thuật toán chọn kho/slot đó.

Project sẽ sử dụng **Next.js + NestJS + TypeScript + Docker**, có data giả bằng JSON/Markdown để người khác clone repo về là có thể test thuật toán ngay.

---

## 2. Main Goal

Xây dựng một hệ thống mô phỏng logistics có thể trả lời các câu hỏi như:

- Hàng này nên được đưa vào kho nào?
- Trong kho đó nên đặt ở slot nào?
- Slot nào còn trống và phù hợp với loại hàng này?
- Hàng lạnh có được đặt đúng kho lạnh không?
- Hàng nặng/cồng kềnh có đủ không gian, chiều cao, tải trọng và lối xe không?
- Kho nào gần cảng hơn?
- Kho nào gần cổng xuất hơn?
- Loại xe nào có thể di chuyển đến vị trí đó?
- Nếu thêm cổng mới hoặc đường mới thì thuật toán có tự tính lại route được không?
- So với random assignment, thuật toán tối ưu cải thiện được bao nhiêu?

---

## 3. Core Concept

Toàn bộ khu logistics được mô hình hóa thành hai tầng:

### 3.1 Site-level Map

Dùng để visualize và tính tuyến đường giữa:

- Cảng
- Cổng vào
- Cổng ra
- Kho
- Dock
- Bãi container
- Khu kiểm tra
- Giao lộ
- Bãi đỗ xe
- Đường nội bộ

Mỗi vị trí lớn có thể có tọa độ địa lý:

```ts
type GeoPoint = {
  lat: number;
  lng: number;
};
```

Ví dụ:

```ts
type Warehouse = {
  id: string;
  name: string;
  type: "normal" | "cold" | "heavy" | "fragile" | "mixed";
  geoLocation: GeoPoint;
  supportedVehicles: VehicleType[];
  temperatureRange?: {
    min: number;
    max: number;
  };
};
```

### 3.2 Warehouse-level Layout

Dùng để visualize bên trong từng kho:

- Slot chứa hàng
- Kệ hàng
- Lối đi
- Dock
- Cửa kho
- Vùng lạnh
- Vùng hàng nặng
- Vùng hàng dễ vỡ
- Vùng nguy hiểm
- Vật cản / đường bị khóa

Bên trong kho không dùng lat/lng, mà dùng local coordinate:

```ts
type LocalPoint = {
  x: number;
  y: number;
  z?: number;
};
```

Ví dụ slot trong kho:

```ts
type StorageSlot = {
  id: string;
  warehouseId: string;
  position: LocalPoint;
  width: number;
  depth: number;
  height: number;
  maxWeight: number;
  currentWeight: number;
  maxVolume: number;
  currentVolume: number;
  zoneType: "normal" | "cold" | "heavy" | "fragile" | "hazardous";
  aisleWidth: number;
  supportedVehicles: VehicleType[];
};
```

---

## 4. Important Design Decision

Không fix cứng một cổng vào hoặc một cổng ra.

Thay vào đó, toàn bộ khu vực được thiết kế thành **dynamic graph**:

- Port là node.
- Gate là node.
- Warehouse là node.
- Dock là node.
- Intersection là node.
- Storage slot là node.
- Road/aisle là edge.

Khi xây rộng thêm khu vực, thêm cổng mới, thêm kho mới hoặc thêm đường mới, chỉ cần thêm node và edge vào dataset. Thuật toán không cần sửa logic lõi.

```ts
type LocationNodeType =
  | "PORT"
  | "GATE"
  | "WAREHOUSE"
  | "DOCK"
  | "INTERSECTION"
  | "SLOT"
  | "PARKING"
  | "CHECKPOINT";

type LocationNode = {
  id: string;
  name: string;
  type: LocationNodeType;
  x?: number;
  y?: number;
  geoLocation?: GeoPoint;
  warehouseId?: string;
};

type RoadEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  allowedVehicles: VehicleType[];
  direction: "one_way" | "two_way";
  congestionLevel: number;
  width: number;
};
```

---

## 5. Route Calculation

Không nên chỉ dựa vào khoảng cách lat/lng.

Lat/lng chỉ dùng để:

- Visualize vị trí kho/cảng/cổng trên overview map.
- Ước lượng khoảng cách ban đầu.
- Tự tạo dữ liệu giả dễ hiểu.

Quyết định cuối phải dựa vào **route cost** trên graph.

Ví dụ:

```ts
type RouteCost = {
  from: string;
  to: string;
  vehicleType: VehicleType;
  totalCost: number;
  distance: number;
  path: string[];
  warnings: string[];
};
```

Route cost có thể gồm:

```txt
movementCost =
  distance
  + congestionPenalty
  + narrowRoadPenalty
  + vehicleRestrictionPenalty
  + oneWayDetourPenalty
  + loadingUnloadingPenalty
```

Ví dụ một kho gần cảng về mặt tọa độ nhưng đường hẹp, xe container không vào được thì vẫn không phải lựa chọn tốt.

---

## 6. Product / Cargo Model

Mỗi hàng hóa có nhiều thuộc tính ảnh hưởng đến việc chọn kho và slot.

```ts
type ProductCategory =
  | "normal"
  | "cold"
  | "fragile"
  | "hazardous"
  | "bulky"
  | "heavy";

type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  weight: number;
  volume: number;
  width?: number;
  depth?: number;
  height?: number;
  demandFrequency: number;
  requiredZone?: "normal" | "cold" | "heavy" | "fragile" | "hazardous";
  requiredTemperature?: {
    min: number;
    max: number;
  };
  preferredEntryNodeId?: string;
  preferredExitNodeId?: string;
  vehicleType: VehicleType;
  priority: "low" | "medium" | "high" | "urgent";
};
```

Ví dụ:

```json
{
  "id": "P001",
  "name": "Frozen Seafood",
  "category": "cold",
  "weight": 120,
  "volume": 3.5,
  "demandFrequency": 85,
  "requiredZone": "cold",
  "requiredTemperature": {
    "min": -25,
    "max": -5
  },
  "preferredExitNodeId": "EXPORT_GATE_01",
  "vehicleType": "forklift",
  "priority": "high"
}
```

---

## 7. Hard Constraints

Hard constraints là các điều kiện bắt buộc. Nếu vi phạm thì slot/kho bị loại ngay.

Ví dụ:

- Hàng lạnh bắt buộc phải vào kho lạnh.
- Hàng cần nhiệt độ âm không được vào kho thường.
- Hàng nặng không được đặt ở slot không đủ tải trọng.
- Hàng cồng kềnh không được đặt ở slot không đủ chiều rộng/chiều cao.
- Hàng nguy hiểm không được đặt gần hàng dễ cháy hoặc khu không cho phép.
- Xe container không được đi vào đường chỉ hỗ trợ forklift.
- Slot không đủ volume/weight còn trống thì bị loại.
- Đường đến slot không có route hợp lệ cho vehicleType thì bị loại.

Pseudo:

```ts
function isSlotValid(product: Product, slot: StorageSlot, context: OptimizationContext): boolean {
  if (slot.currentWeight + product.weight > slot.maxWeight) return false;
  if (slot.currentVolume + product.volume > slot.maxVolume) return false;
  if (product.requiredZone && product.requiredZone !== slot.zoneType) return false;
  if (!slot.supportedVehicles.includes(product.vehicleType)) return false;

  return true;
}
```

---

## 8. Soft Scoring

Sau khi lọc hard constraints, các slot hợp lệ sẽ được chấm điểm.

Điểm càng cao thì slot càng phù hợp.

Ví dụ scoring:

```txt
finalScore =
  0.25 * capacityFitScore
+ 0.20 * movementCostScore
+ 0.20 * categoryMatchScore
+ 0.15 * vehicleAccessScore
+ 0.10 * demandPriorityScore
+ 0.10 * congestionScore
```

Các thành phần scoring:

### Capacity Fit Score

Đánh giá slot có vừa với hàng không, và có tận dụng không gian hợp lý không.

### Movement Cost Score

Dựa trên route cost từ cảng/cổng/dock tới slot.

### Category Match Score

Hàng lạnh vào khu lạnh, hàng nặng vào khu nặng, hàng dễ vỡ vào khu fragile.

### Vehicle Access Score

Slot/kho/đường có hỗ trợ loại xe cần dùng không.

### Demand Priority Score

Hàng xuất thường xuyên nên ưu tiên gần cổng/dock hơn.

### Congestion Score

Tránh đặt hàng ở khu/lối đi đang quá tải hoặc dễ nghẽn.

---

## 9. Algorithm Pipeline

Pipeline tổng thể:

```txt
Product requirement
        ↓
Warehouse filter
        ↓
Slot filter
        ↓
Route cost calculation
        ↓
Soft scoring
        ↓
Ranking
        ↓
Assignment
        ↓
Explainable result
```

Kết quả không chỉ là slot được chọn, mà còn có lý do:

```json
{
  "productId": "P001",
  "assignedWarehouseId": "WH_COLD_01",
  "assignedSlotId": "COLD_A_12",
  "score": 91,
  "reasons": [
    "Required cold zone matched",
    "Temperature range matched",
    "Enough volume and weight capacity",
    "Forklift route is available",
    "Close to export gate",
    "Low congestion path"
  ],
  "rejectedCandidates": [
    {
      "slotId": "N_A_01",
      "reason": "Product requires cold storage"
    },
    {
      "slotId": "C_A_03",
      "reason": "Not enough remaining volume"
    }
  ]
}
```

---

## 10. Core Algorithms

### 10.1 Random Assignment

Dùng làm baseline để so sánh.

Mục tiêu: chứng minh nếu xếp ngẫu nhiên thì số lỗi và chi phí di chuyển cao hơn.

### 10.2 Constraint Filtering

Lọc kho/slot không hợp lệ theo hard constraints.

### 10.3 Weighted Scoring

Chấm điểm các candidate hợp lệ.

### 10.4 Greedy Assignment

Sắp product theo độ ưu tiên rồi chọn slot tốt nhất.

Thứ tự ưu tiên có thể là:

```txt
urgent > cold > hazardous > bulky > heavy > high-demand > normal
```

### 10.5 Local Search

Sau khi greedy tạo ra kết quả ban đầu, thử swap slot giữa các product.

Nếu tổng score tốt hơn và không vi phạm constraint thì giữ swap.

Pseudo:

```ts
for each pair of assignments:
  swapped = swapSlots(a, b)

  if isValid(swapped) and score(swapped) > currentScore:
    accept swapped
```

### 10.6 A* / Dijkstra

Dùng để tính route cost giữa:

- Port → Warehouse dock
- Gate → Warehouse dock
- Warehouse dock → Slot
- Slot → Exit gate

Dijkstra phù hợp nếu graph có weight phức tạp.
A* phù hợp nếu có tọa độ và muốn heuristic theo vị trí.

### 10.7 Simulated Annealing

Optional phase sau.

Dùng cho bài toán tối ưu nhiều product/slot khi greedy + local search chưa đủ tốt.

---

## 11. Visualization Plan

Không cần 3D ở MVP.

Dùng 2D/2.5D là đủ đẹp, dễ demo và dễ tập trung vào thuật toán.

### 11.1 Site Overview Map

Visualize toàn khu:

- Cảng
- Cổng
- Kho
- Bãi
- Đường
- Giao lộ
- Dock
- Khu xe tải

Mỗi warehouse hiển thị:

- Tên kho
- Loại kho
- Capacity usage
- Nhiệt độ
- Khoảng cách/route cost tới cảng
- Khoảng cách/route cost tới cổng
- Loại xe hỗ trợ

Trạng thái màu:

```txt
Gray   = bị loại
Yellow = hợp lệ nhưng điểm trung bình
Green  = đề xuất tốt nhất
Red    = vi phạm hard constraint
Blue   = đang được chọn/xem chi tiết
```

### 11.2 Warehouse Detail Grid

Click vào warehouse thì mở layout bên trong.

Ví dụ:

```txt
D . . . . . . E
. S S S . C C .
. S S S . C C .
. . . . . . . .
. H H H X F F .
. H H H X F F .
```

Legend:

```txt
D = dock
E = exit
S = normal slot
C = cold slot
H = heavy slot
F = fragile slot
X = blocked path
```

Mỗi slot có tooltip/panel:

```txt
Slot C-04
Zone: Cold
Width: 2.5m
Depth: 3m
Height: 4m
Max weight: 800kg
Current volume: 63%
Temperature: -18°C
Vehicle access: forklift
```

### 11.3 Candidate Highlighting

Khi chọn một product:

- Các kho không hợp lệ bị tô xám/đỏ.
- Các kho hợp lệ được tô vàng/xanh.
- Các slot không đủ điều kiện bị tô đỏ/xám.
- Các slot candidate được tô theo score.
- Slot tốt nhất được highlight.
- Route từ entry/dock tới slot được vẽ trên layout.

### 11.4 Result Dashboard

Hiển thị:

- Best warehouse
- Best slot
- Final score
- Movement cost
- Capacity fit
- Vehicle access
- Temperature match
- Congestion risk
- Violation count
- Runtime

---

## 12. Benchmark Metrics

Mỗi lần chạy thuật toán cần có benchmark để so sánh.

Ví dụ:

```txt
Algorithm: Greedy + Local Search
Products assigned: 120
Unassigned products: 3
Hard constraint violations: 0
Movement cost: 1280
Average retrieval cost: 18.4
Space utilization: 79%
Congestion score: 0.22
Runtime: 18ms
Optimization score: 87/100
```

Bảng so sánh:

| Algorithm | Violations | Movement Cost | Space Usage | Runtime | Score |
|---|---:|---:|---:|---:|---:|
| Random | 14 | 2310 | 62% | 2ms | 41 |
| Greedy | 0 | 1510 | 74% | 8ms | 78 |
| Greedy + Local Search | 0 | 1280 | 79% | 21ms | 87 |

---

## 13. Data Strategy

Project dùng data giả để không tốn tiền và không phụ thuộc API ngoài.

JSON dùng để app chạy.
Markdown dùng để giải thích dataset.

Cấu trúc:

```txt
datasets/
├── small-warehouse.json
├── cold-chain-export.json
├── heavy-cargo-port.json
├── congested-yard.json
└── mixed-priority-orders.json

docs/
├── dataset-schema.md
├── sample-scenarios.md
├── algorithm-design.md
├── scoring.md
└── benchmark-result.md
```

### Sample Scenarios

#### Small Warehouse

Test logic cơ bản.

#### Cold Chain Export

Test hàng lạnh, nhiệt độ, gần export gate.

#### Heavy Cargo Port

Test hàng nặng, xe chuyên dụng, slot chịu tải.

#### Congested Yard

Test đường bị nghẽn, lối hẹp, vehicle restriction.

#### Mixed Priority Orders

Test nhiều loại hàng cùng lúc.

---

## 14. API Design

NestJS API có thể expose:

```txt
GET  /scenarios
GET  /scenarios/:id
GET  /algorithms
POST /optimization/run
POST /optimization/compare
GET  /health
```

### Run Optimization Request

```json
{
  "scenarioId": "cold-chain-export",
  "algorithm": "greedy-local-search",
  "weights": {
    "capacityFit": 0.25,
    "movementCost": 0.2,
    "categoryMatch": 0.2,
    "vehicleAccess": 0.15,
    "demandPriority": 0.1,
    "congestion": 0.1
  }
}
```

### Run Optimization Response

```json
{
  "algorithm": "greedy-local-search",
  "score": 87,
  "runtimeMs": 18,
  "violations": {
    "capacity": 0,
    "temperature": 0,
    "vehicleAccess": 0
  },
  "metrics": {
    "movementCost": 1280,
    "spaceUtilization": 0.79,
    "averageDistanceToExit": 18.4
  },
  "assignments": [
    {
      "productId": "P001",
      "warehouseId": "WH_COLD_01",
      "slotId": "C-02",
      "score": 91,
      "reasons": [
        "Required cold zone matched",
        "Capacity fit is good",
        "Forklift access is available",
        "Close to export gate"
      ]
    }
  ]
}
```

---

## 15. Suggested Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- SVG / CSS Grid for visualization
- Optional: Canvas later if dataset lớn

### Backend

- NestJS
- TypeScript
- Swagger/OpenAPI
- Algorithms written as pure TypeScript modules

### DevOps

- Docker
- Docker Compose
- GitHub Actions optional
- No database required for MVP

### Data

- JSON fixtures
- Markdown documentation

---

## 16. Suggested Project Structure

```txt
CargoGrid
├── apps
│   ├── web
│   └── api
│
├── packages
│   ├── core
│   ├── algorithms
│   └── fixtures
│
├── datasets
│   ├── small-warehouse.json
│   ├── cold-chain-export.json
│   ├── heavy-cargo-port.json
│   ├── congested-yard.json
│   └── mixed-priority-orders.json
│
├── docs
│   ├── dataset-schema.md
│   ├── sample-scenarios.md
│   ├── algorithm-design.md
│   ├── scoring.md
│   └── benchmark-result.md
│
├── docker-compose.yml
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

Simpler MVP structure:

```txt
cargogrid
├── web
├── api
├── docs
├── datasets
└── docker-compose.yml
```

---

## 17. Docker Plan

Người dùng có thể chạy toàn bộ project bằng:

```bash
docker compose up --build
```

Sau đó mở:

```txt
Web: http://localhost:3000
API: http://localhost:8080
Swagger: http://localhost:8080/docs
```

Không cần database ở MVP. API đọc data từ JSON fixtures.

---

## 18. Open-source Plan

Repo nên có:

- README rõ ràng.
- Demo screenshots/GIF.
- Docker setup.
- Sample datasets.
- Algorithm documentation.
- Contribution guide.
- MIT License.
- Issue templates.
- Good first issues.

Ví dụ good first issues:

```txt
Add Simulated Annealing optimizer
Add new warehouse scenario
Add CSV export
Add slot heatmap
Add vehicle route visualization
Add congestion scoring
Add container yard mode
Improve warehouse grid responsiveness
```

---

## 19. MVP Scope

MVP nên tập trung vào:

1. Next.js web dashboard.
2. NestJS API.
3. JSON fake datasets.
4. Multi-warehouse overview.
5. Warehouse detail grid.
6. Product selector.
7. Suitable warehouse/slot finder.
8. Hard constraint filtering.
9. Weighted scoring.
10. Greedy assignment.
11. Benchmark against random assignment.
12. Explanation panel.
13. Docker compose.

MVP chưa cần:

- Database.
- Real map API.
- Google Maps.
- 3D visualization.
- Real logistics data.
- Multi-user auth.
- Production-grade warehouse management.

---

## 20. Phase 2

Sau MVP:

- A* / Dijkstra route cost trên graph.
- Multi-product assignment.
- Local search swap optimization.
- Better benchmark dashboard.
- Congestion score.
- Export result as JSON/CSV.
- Save/load custom scenario.
- User can add gate, road, warehouse, dock in editor.

---

## 21. Phase 3

Nâng cấp lớn:

- Simulated Annealing.
- Container yard slotting mode.
- Vehicle flow simulation.
- Time-based inbound/outbound schedule.
- Heatmap of warehouse utilization.
- Heatmap of congestion.
- Optional 3D warehouse view.
- Optional PostgreSQL if cần persistence.

---

## 22. Portfolio Description

Có thể ghi trong portfolio:

```txt
CargoGrid — Open-source Warehouse Slotting Optimization Simulator

Built a Next.js + NestJS logistics optimization simulator that assigns cargo to warehouses and storage slots using hard constraint filtering, weighted scoring, graph-based movement cost, greedy assignment, and local search optimization. The system includes synthetic logistics datasets, benchmark comparison, explainable assignment results, warehouse visualization, Swagger API docs, and Docker-based local deployment.
```

Tech stack:

```txt
Next.js, NestJS, TypeScript, Docker, Swagger, Algorithm Design, Optimization, Logistics Simulation
```

Algorithm highlights:

```txt
Hard Constraint Filtering
Weighted Scoring
Greedy Assignment
Local Search Optimization
Graph-based Route Cost
Benchmark Comparison
Explainable Optimization
```

---

## 23. Why This Project Is Valuable

Project này không phải là app quản lý kho CRUD thông thường.

Giá trị chính nằm ở:

- Mô hình hóa bài toán logistics thực tế.
- Tách hard constraints và soft scoring.
- Tối ưu chọn kho/slot dựa trên nhiều yếu tố.
- Tính route cost theo graph động, không fix cứng cổng/kho.
- Visualize quyết định thuật toán.
- Benchmark thuật toán trước/sau.
- Có thể open-source và mở rộng bằng nhiều thuật toán khác.

Nó thể hiện rằng developer không chỉ biết làm frontend/backend, mà còn biết:

- Phân tích domain.
- Thiết kế data model.
- Viết thuật toán.
- Đo hiệu quả.
- Trực quan hóa kết quả.
- Xây dựng project có kiến trúc rõ ràng.
