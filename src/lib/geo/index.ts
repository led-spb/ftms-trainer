export interface Point {
    latitude: number
    longitude: number
    altitude: number
}

const R = 6371000; 


export function geoDistance(point1 :Point, point2 :Point) {
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// function getPositionByDistance(trackPoints, targetDistance) {
//     // Проверка на пустой список
//     if (!trackPoints || trackPoints.length === 0) {
//         return null;
//     }


//     // Вычисляем накопленные расстояния между точками
//     const cumulativeDistances = [0];
//     let totalDistance = 0;
    
//     for (let i = 1; i < trackPoints.length; i++) {
//         const dist = haversineDistance(trackPoints[i - 1], trackPoints[i]);
//         totalDistance += dist;
//         cumulativeDistances.push(totalDistance);
//     }

//     // Если целевое расстояние больше общего, возвращаем последнюю точку
//     if (targetDistance >= totalDistance) {
//         const lastPoint = trackPoints[trackPoints.length - 1];
//         return {
//             nearestPoints: [trackPoints[trackPoints.length - 2], lastPoint],
//             coordinates: {
//                 longitude: lastPoint[0],
//                 latitude: lastPoint[1],
//                 altitude: lastPoint[2]
//             },
//             gradient: null // градиент не определен для последней точки
//         };
//     }

//     // Находим 2 ближайшие точки, между которыми находится targetDistance
//     let startIndex = 0;
//     for (let i = 0; i < cumulativeDistances.length - 1; i++) {
//         if (targetDistance >= cumulativeDistances[i] && targetDistance <= cumulativeDistances[i + 1]) {
//             startIndex = i;
//             break;
//         }
//     }

//     const pointA = trackPoints[startIndex];
//     const pointB = trackPoints[startIndex + 1];
//     const distA = cumulativeDistances[startIndex];
//     const distB = cumulativeDistances[startIndex + 1];
//     const segmentLength = distB - distA;

//     // Вычисляем долю пройденного пути на сегменте
//     const fraction = (targetDistance - distA) / segmentLength;

//     // Интерполяция координат
//     const lon = pointA[0] + (pointB[0] - pointA[0]) * fraction;
//     const lat = pointA[1] + (pointB[1] - pointA[1]) * fraction;
//     const alt = pointA[2] + (pointB[2] - pointA[2]) * fraction;

//     // Вычисляем градиент наклона в процентах
//     // Градиент = (изменение высоты / горизонтальное расстояние) * 100%
//     const horizontalDistance = haversineDistance(pointA, pointB);
//     const verticalChange = pointB[2] - pointA[2];
//     const gradient = horizontalDistance > 0 ? (verticalChange / horizontalDistance) * 100 : 0;

//     return {
//         nearestPoints: [pointA, pointB],
//         coordinates: {
//             longitude: lon,
//             latitude: lat,
//             altitude: alt
//         },
//         gradient: gradient
//     };
// }

// // Пример использования:
// const trackPoints = [
//     [30.0, 50.0, 100],   // [longitude, latitude, altitude]
//     [30.1, 50.1, 120],
//     [30.2, 50.2, 110],
//     [30.3, 50.3, 130]
// ];

// const result = getPositionByDistance(trackPoints, 15000); // 15 км

// console.log('2 ближайшие точки:', result.nearestPoints);
// console.log('Точные координаты:', result.coordinates);
// console.log('Градиент наклона (%):', result.gradient);