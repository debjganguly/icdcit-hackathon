from flask import Flask, jsonify, request
from flask_cors import CORS
import ee
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Google Earth Engine
try:
    ee.Initialize()
    logger.info("Google Earth Engine initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Earth Engine: {e}")
    try:
        ee.Authenticate()
        ee.Initialize()
    except:
        logger.warning("GEE authentication failed, using fallback data")

# Configuration
BHUBANESWAR_BOUNDS = {
    'min_lon': 85.72,
    'max_lon': 85.92,
    'min_lat': 20.20,
    'max_lat': 20.40
}


class NDVICalculator:
    """Calculate Normalized Difference Vegetation Index"""

    @staticmethod
    def calculate(nir, red):
        """
        NDVI = (NIR - Red) / (NIR + Red)
        Range: -1 to 1
        - Negative values: Water bodies
        - 0 to 0.2: Barren areas
        - 0.2 to 0.5: Sparse vegetation
        - 0.5 to 1.0: Dense vegetation
        """
        return (nir - red) / (nir + red + 1e-10)


class LSTCalculator:
    """Calculate Land Surface Temperature"""

    @staticmethod
    def brightness_temperature(thermal_band):
        """Convert thermal band to brightness temperature in Celsius"""
        # Landsat 8 thermal constants
        K1 = 774.8853
        K2 = 1321.0789

        # Convert to at-sensor brightness temperature
        bt = (K2 / np.log((K1 / thermal_band) + 1)) - 273.15
        return bt

    @staticmethod
    def emissivity_correction(ndvi):
        """Calculate emissivity based on NDVI"""
        # Threshold method for emissivity
        ndvi_s = 0.2  # Soil
        ndvi_v = 0.5  # Vegetation

        # Fractional vegetation cover
        pv = np.where(ndvi < ndvi_s, 0,
                      np.where(ndvi > ndvi_v, 1,
                               ((ndvi - ndvi_s) / (ndvi_v - ndvi_s)) ** 2))

        # Emissivity calculation
        es = 0.973  # Soil emissivity
        ev = 0.987  # Vegetation emissivity
        emissivity = es * (1 - pv) + ev * pv

        return emissivity

    @staticmethod
    def calculate_lst(thermal_band, ndvi):
        """
        Calculate Land Surface Temperature using emissivity correction
        """
        # Get brightness temperature
        bt = LSTCalculator.brightness_temperature(thermal_band)

        # Calculate emissivity
        emissivity = LSTCalculator.emissivity_correction(ndvi)

        # Calculate LST with emissivity correction
        wavelength = 10.9e-6  # Landsat 8 Band 10 wavelength (micrometers)
        c1 = 1.438e-2  # Planck's constant

        lst = bt / (1 + (wavelength * bt / c1) * np.log(emissivity))

        return lst


class UHIAnalyzer:
    """Main UHI Analysis Service"""

    @staticmethod
    def fetch_satellite_data(start_date, end_date, bounds):
        """Fetch Landsat 8 data from Google Earth Engine"""
        try:
            aoi = ee.Geometry.Rectangle([
                bounds['min_lon'], bounds['min_lat'],
                bounds['max_lon'], bounds['max_lat']
            ])

            # Landsat 8 Collection
            landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
                .filterBounds(aoi) \
                .filterDate(start_date, end_date) \
                .filter(ee.Filter.lt('CLOUD_COVER', 20)) \
                .sort('system:time_start', False)

            if landsat.size().getInfo() == 0:
                raise Exception("No Landsat data available for this period")

            image = landsat.first()

            # Get bands
            # SR = Surface Reflectance, ST = Surface Temperature
            nir = image.select('SR_B5').multiply(0.0000275).add(-0.2)  # NIR
            red = image.select('SR_B4').multiply(0.0000275).add(-0.2)  # Red
            thermal = image.select('ST_B10').multiply(0.00341802).add(149.0)  # Thermal

            return {
                'nir': nir,
                'red': red,
                'thermal': thermal,
                'aoi': aoi,
                'image_date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
            }

        except Exception as e:
            logger.error(f"Error fetching satellite data: {e}")
            raise

    @staticmethod
    def sample_points(satellite_data, num_points):
        """Sample random points from satellite data"""
        try:
            points = ee.FeatureCollection.randomPoints(
                satellite_data['aoi'],
                num_points
            )

            # Calculate NDVI
            ndvi = satellite_data['nir'].subtract(satellite_data['red']) \
                .divide(satellite_data['nir'].add(satellite_data['red'])) \
                .rename('NDVI')

            # Use thermal band directly (already in Celsius from scaling)
            lst = satellite_data['thermal'].subtract(273.15).rename('LST')

            # Combine bands
            combined = ee.Image.cat([lst, ndvi])

            # Sample at points
            sampled = combined.sampleRegions(
                collection=points,
                scale=30,
                geometries=True
            )

            features = sampled.getInfo()['features']

            data = []
            for feature in features:
                props = feature['properties']
                coords = feature['geometry']['coordinates']

                if 'LST' in props and 'NDVI' in props:
                    lst_val = float(props['LST'])
                    ndvi_val = float(props['NDVI'])

                    # Filter out invalid values
                    if -50 < lst_val < 70 and -1 <= ndvi_val <= 1:
                        data.append({
                            'lon': coords[0],
                            'lat': coords[1],
                            'lst': lst_val,
                            'ndvi': ndvi_val
                        })

            return data

        except Exception as e:
            logger.error(f"Error sampling points: {e}")
            raise

    @staticmethod
    def classify_heat_zones(data, n_clusters=3):
        """Classify heat zones using K-Means clustering"""
        try:
            if len(data) < n_clusters:
                raise ValueError(f"Insufficient data points. Need at least {n_clusters}")

            # Prepare features
            X = np.array([[d['lst'], d['ndvi']] for d in data])

            # Standardize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # K-Means clustering
            kmeans = KMeans(
                n_clusters=n_clusters,
                random_state=42,
                n_init=10,
                max_iter=300
            )
            labels = kmeans.fit_predict(X_scaled)

            # Get cluster centers in original scale
            centers = scaler.inverse_transform(kmeans.cluster_centers_)

            # Sort clusters by LST (high to low)
            center_indices = np.argsort(centers[:, 0])[::-1]
            label_mapping = {center_indices[i]: i for i in range(n_clusters)}

            # Classify and add recommendations
            for i, d in enumerate(data):
                original_label = labels[i]
                d['zone'] = label_mapping[original_label]
                d['cluster_id'] = int(original_label)

                # Calculate UHI intensity
                avg_lst = np.mean([pt['lst'] for pt in data])
                d['uhi_intensity'] = d['lst'] - avg_lst

                # Add detailed recommendations
                if d['zone'] == 0:  # High heat zone
                    d['severity'] = 'Critical'
                    d[
                        'recommendation'] = 'Urgent: Implement green infrastructure - tree plantation, green roofs, vertical gardens, cool pavements'
                    d['priority'] = 1
                    d['color'] = '#ef4444'
                elif d['zone'] == 1:  # Medium heat zone
                    d['severity'] = 'Moderate'
                    d[
                        'recommendation'] = 'Medium Priority: Develop urban parks, water bodies, increase albedo with reflective surfaces'
                    d['priority'] = 2
                    d['color'] = '#f97316'
                else:  # Low heat zone
                    d['severity'] = 'Low'
                    d['recommendation'] = 'Maintenance: Preserve existing vegetation, monitor for changes'
                    d['priority'] = 3
                    d['color'] = '#22c55e'

                # Add vegetation category
                if d['ndvi'] < 0:
                    d['vegetation'] = 'Water/Built-up'
                elif d['ndvi'] < 0.2:
                    d['vegetation'] = 'Barren/Sparse'
                elif d['ndvi'] < 0.5:
                    d['vegetation'] = 'Moderate Vegetation'
                else:
                    d['vegetation'] = 'Dense Vegetation'

            return data

        except Exception as e:
            logger.error(f"Error in heat zone classification: {e}")
            raise


# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'UHI Analysis API',
        'timestamp': datetime.now().isoformat(),
        'gee_status': 'active'
    })


@app.route('/api/uhi', methods=['GET'])
def get_uhi_data():
    """Main endpoint for UHI analysis"""
    try:
        # Get parameters
        num_points = int(request.args.get('points', 100))
        days_back = int(request.args.get('days', 30))

        # Validate parameters
        if num_points < 10 or num_points > 500:
            return jsonify({'error': 'Points must be between 10 and 500'}), 400

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        logger.info(f"Processing UHI data: {num_points} points, {days_back} days")

        # Initialize analyzer
        analyzer = UHIAnalyzer()

        # Fetch satellite data
        satellite_data = analyzer.fetch_satellite_data(
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            BHUBANESWAR_BOUNDS
        )

        # Sample points
        data = analyzer.sample_points(satellite_data, num_points)

        if not data:
            return jsonify({
                'error': 'No valid data points found',
                'message': 'Try adjusting the date range or location'
            }), 404

        # Classify heat zones
        classified_data = analyzer.classify_heat_zones(data)

        # Calculate comprehensive statistics
        lst_values = [d['lst'] for d in classified_data]
        ndvi_values = [d['ndvi'] for d in classified_data]
        uhi_intensities = [d['uhi_intensity'] for d in classified_data]

        statistics = {
            'total_points': len(classified_data),
            'high_heat_zones': sum(1 for d in classified_data if d['zone'] == 0),
            'medium_heat_zones': sum(1 for d in classified_data if d['zone'] == 1),
            'low_heat_zones': sum(1 for d in classified_data if d['zone'] == 2),
            'temperature': {
                'avg_lst': round(np.mean(lst_values), 2),
                'min_lst': round(np.min(lst_values), 2),
                'max_lst': round(np.max(lst_values), 2),
                'std_lst': round(np.std(lst_values), 2)
            },
            'vegetation': {
                'avg_ndvi': round(np.mean(ndvi_values), 3),
                'min_ndvi': round(np.min(ndvi_values), 3),
                'max_ndvi': round(np.max(ndvi_values), 3)
            },
            'uhi': {
                'max_intensity': round(np.max(uhi_intensities), 2),
                'avg_intensity': round(np.mean(uhi_intensities), 2)
            },
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d'),
                'image_date': satellite_data['image_date']
            }
        }

        return jsonify({
            'success': True,
            'data': classified_data,
            'statistics': statistics,
            'metadata': {
                'source': 'Landsat 8 (Google Earth Engine)',
                'algorithms': ['NDVI', 'LST', 'K-Means Clustering'],
                'generated_at': datetime.now().isoformat(),
                'location': 'Bhubaneswar, Odisha'
            }
        })

    except Exception as e:
        logger.error(f"Error in get_uhi_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process UHI data',
            'message': str(e)
        }), 500


@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get detailed statistics"""
    try:
        # This would typically use cached data
        # For now, redirect to main endpoint
        return jsonify({
            'message': 'Use /api/uhi endpoint for statistics'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)